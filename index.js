const fs = require('fs');
const archiver = require('archiver');
const { NodeSSH } = require('node-ssh');
const path = require('path');

/**
 * Vite 插件：打包并上传部署构建产物
 *
 * @param {Object} packageOptions - 打包相关配置
 * @param {boolean} [packageOptions.enable=true] - 是否执行打包
 * @param {string} [packageOptions.localDir='dist'] - 本地构建目录
 * @param {string} [packageOptions.zipFileName='build.zip'] - 压缩包名称
 * @param {Function} [packageOptions.onSuccess] - 打包成功回调
 * @param {Function} [packageOptions.onError] - 打包失败回调
 *
 * @param {Object} deployOptions - 上传和部署相关配置
 * @param {boolean} [deployOptions.enable=false] - 是否执行上传和部署
 * @param {string} [deployOptions.host] - SSH 主机地址
 * @param {number} [deployOptions.port=22] - SSH 端口
 * @param {string} [deployOptions.username] - SSH 用户名
 * @param {string} [deployOptions.password] - SSH 密码
 * @param {string} [deployOptions.privateKey] - SSH 私钥路径或私钥内容
 * @param {string} [deployOptions.remoteZipPath] - 远程服务器上的 ZIP 文件路径
 * @param {string} [deployOptions.remoteUnzipDir] - 远程服务器上的解压目录
 * @param {Array<string>} [deployOptions.commands=[]] - 用户定义的部署命令列表
 * @param {Function} [deployOptions.onSuccess] - 上传和部署成功回调
 * @param {Function} [deployOptions.onError] - 上传和部署失败回调
 */
function zipAndUploadBuild(packageOptions = {}, deployOptions = {}) {
    const {
        enable: enablePackage = true,
        localDir = 'dist',
        zipFileName = 'build.zip',
        onSuccess: packageOnSuccess,
        onError: packageOnError
    } = packageOptions;

    const {
        enable: enableUpload = false,
        host,
        port = 22,
        username,
        password,
        privateKey,
        remoteZipPath,
        remoteUnzipDir,
        commands = [],
        onSuccess: deployOnSuccess,
        onError: deployOnError
    } = deployOptions;

    // 验证配置
    const configErrors = validateConfig({ enablePackage, enableUpload, deployOptions });
    if (configErrors.length > 0) {
        const errorMsg = `zip-and-upload-build 插件配置错误:\n${configErrors.join('\n')}`;
        console.error(errorMsg);
        if (packageOnError) packageOnError(new Error(errorMsg));
        if (deployOnError && enableUpload) deployOnError(new Error(errorMsg));
        throw new Error(errorMsg);
    }

    return {
        name: 'zip-and-upload-build',
        apply: 'build',
        async closeBundle() {
            try {
                // 检查是否需要执行打包
                if (!enablePackage) {
                    console.log('打包开关已关闭，跳过打包步骤。');
                    // 如果不需要打包但需要上传，则提示错误
                    if (enableUpload) {
                        const warningMsg = '上传开关已开启，但打包开关已关闭，上传操作将被跳过。';
                        console.warn(warningMsg);
                        if (deployOnError) deployOnError(new Error(warningMsg));
                        throw new Error(warningMsg);
                    }
                    if (packageOnSuccess) packageOnSuccess();
                    return;
                }

                const zipFilePath = path.join(localDir, zipFileName); // 将压缩包放在 localDir 下
                const output = fs.createWriteStream(zipFilePath);
                const archive = archiver('zip', {
                    zlib: { level: 9 } // 设置压缩等级
                });

                // 监听压缩完成事件
                output.on('close', async function () {
                    console.log(`打包完成。压缩包大小: ${archive.pointer()} 字节`);
                    console.log(`压缩包路径: ${zipFilePath}`);

                    if (packageOnSuccess) packageOnSuccess();

                    // 检查是否需要执行上传
                    if (enableUpload) {
                        // 校验 SSH 配置是否完整
                        const isSSHConfigValid = validateSSHConfig(deployOptions);
                        if (!isSSHConfigValid) {
                            const errorMsg = 'SSH 配置不完整，上传操作已取消。';
                            console.error(errorMsg);
                            if (deployOnError) deployOnError(new Error(errorMsg));
                            throw new Error(errorMsg);
                        }

                        try {
                            await uploadAndDeploy({
                                host,
                                port,
                                username,
                                password,
                                privateKey,
                                localZipPath: zipFilePath,
                                remoteZipPath,
                                remoteUnzipDir,
                                commands
                            });
                            console.log('上传和部署操作已成功完成。');
                            if (deployOnSuccess) deployOnSuccess();
                        } catch (err) {
                            const errorMsg = '上传或执行部署命令时发生错误。';
                            console.error(errorMsg, err);
                            if (deployOnError) deployOnError(err);
                            throw err;
                        }
                    }
                });

                // 监听压缩错误事件
                archive.on('error', function (err) {
                    const errorMsg = '压缩过程中发生错误。';
                    console.error(errorMsg, err);
                    if (packageOnError) packageOnError(err);
                    throw err;
                });

                archive.pipe(output);

                // 使用 glob 添加文件，并排除压缩包本身
                archive.glob('**/*', {
                    cwd: localDir,
                    ignore: [zipFileName]
                });

                // 开始压缩
                await archive.finalize();

            } catch (err) {
                // 在任何步骤失败时，确保错误被捕获并适当处理
                console.error('打包或上传部署过程中发生错误:', err);
                throw err;
            }
        }
    }
}

/**
 * 验证插件配置的完整性
 *
 * @param {Object} params - 验证参数
 * @param {boolean} params.enablePackage - 是否启用打包
 * @param {boolean} params.enableUpload - 是否启用上传
 * @param {Object} params.deployOptions - 上传相关配置
 * @returns {Array<string>} - 配置错误信息数组
 */
function validateConfig({ enablePackage, enableUpload, deployOptions }) {
    const errors = [];

    // 如果启用上传，必须启用打包
    if (enableUpload && !enablePackage) {
        errors.push('启用上传操作时，必须同时启用打包操作。');
    }

    // 验证上传相关配置
    const deployErrors = validateDeployOptions(deployOptions);
    if (deployErrors.length > 0) {
        errors.push(...deployErrors);
    }

    return errors;
}

/**
 * 验证上传相关配置的完整性
 *
 * @param {Object} deployOptions - 上传相关配置
 * @returns {Array<string>} - 配置错误信息数组
 */
function validateDeployOptions(deployOptions) {
    const errors = [];
    const { enable, host, port, username, remoteZipPath, remoteUnzipDir, password, privateKey, commands } = deployOptions;

    if (enable) {
        if (!host) errors.push('上传操作需要配置 SSH 主机地址 (host)。');
        if (!port) errors.push('上传操作需要配置 SSH 端口 (port)。');
        if (!username) errors.push('上传操作需要配置 SSH 用户名 (username)。');
        if (!remoteZipPath) errors.push('上传操作需要配置远程 ZIP 文件路径 (remoteZipPath)。');
        if (!remoteUnzipDir) errors.push('上传操作需要配置远程解压目录路径 (remoteUnzipDir)。');
        if (!password && !privateKey) errors.push('上传操作需要提供 SSH 密码 (password) 或私钥路径 (privateKey)。');
        if (privateKey && !fs.existsSync(privateKey) && !isPrivateKeyContent(privateKey)) {
            errors.push(`SSH 私钥文件不存在或私钥内容无效: ${privateKey}`);
        }
        if (commands && !Array.isArray(commands)) errors.push('部署命令 (commands) 必须是一个字符串数组。');
    }

    return errors;
}

/**
 * 校验 SSH 配置是否完整
 *
 * @param {Object} deployOptions - 上传相关配置
 * @param {string} deployOptions.host - SSH 主机地址
 * @param {number} deployOptions.port - SSH 端口
 * @param {string} deployOptions.username - SSH 用户名
 * @param {string} [deployOptions.password] - SSH 密码
 * @param {string} [deployOptions.privateKey] - SSH 私钥路径或私钥内容
 * @returns {boolean} - 配置是否完整
 */
function validateSSHConfig({ host, port, username, password, privateKey }) {
    if (!host || !port || !username) {
        return false;
    }
    // 必须提供密码或私钥
    if (!password && !privateKey) {
        return false;
    }
    // 如果提供了私钥路径，检查文件是否存在
    if (privateKey && fs.existsSync(privateKey)) {
        return true;
    }
    // 如果不作为路径存在，则假设是私钥内容
    if (privateKey && !fs.existsSync(privateKey)) {
        // 简单判断是否是有效的私钥内容
        return isPrivateKeyContent(privateKey);
    }
    return false;
}

/**
 * 判断字符串是否为有效的私钥内容
 *
 * @param {string} key - 私钥内容
 * @returns {boolean} - 是否为有效私钥内容
 */
function isPrivateKeyContent(key) {
    return (
        key.startsWith('-----BEGIN RSA PRIVATE KEY-----') ||
        key.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----') ||
        key.startsWith('-----BEGIN DSA PRIVATE KEY-----') ||
        key.startsWith('-----BEGIN EC PRIVATE KEY-----')
    );
}

/**
 * 上传并执行部署命令到远程服务器
 *
 * @param {Object} params - 上传和部署参数
 * @param {string} params.host - SSH 主机地址
 * @param {number} params.port - SSH 端口
 * @param {string} params.username - SSH 用户名
 * @param {string} [params.password] - SSH 密码
 * @param {string} [params.privateKey] - SSH 私钥路径或私钥内容
 * @param {string} params.localZipPath - 本地压缩包路径
 * @param {string} params.remoteZipPath - 远程服务器上的压缩包路径
 * @param {string} params.remoteUnzipDir - 远程服务器上的解压目录
 * @param {Array<string>} params.commands - 用户定义的部署命令列表
 */
async function uploadAndDeploy({
                                   host,
                                   port,
                                   username,
                                   password,
                                   privateKey,
                                   localZipPath,
                                   remoteZipPath,
                                   remoteUnzipDir,
                                   commands
                               }) {
    const ssh = new NodeSSH();
    try {
        // SSH 连接配置
        const sshConfig = {
            host,
            port,
            username,
            ...(password ? { password } : {}),
            ...(privateKey ? { privateKey } : {})
        };

        console.log('正在建立 SSH 连接...');
        await ssh.connect(sshConfig);
        console.log('SSH 连接已建立。');

        // 上传 ZIP 文件
        console.log(`正在上传 ${path.resolve(localZipPath)} 到 ${remoteZipPath}...`);
        await ssh.putFile(path.resolve(localZipPath), remoteZipPath);
        console.log('文件上传成功。');

        // 解压缩 ZIP 文件到远程目录
        if (remoteUnzipDir) {
            const unzipCmd = `unzip -o ${remoteZipPath} -d ${remoteUnzipDir}`;
            console.log(`正在解压缩文件到 ${remoteUnzipDir}...`);
            const unzipResult = await ssh.execCommand(unzipCmd);
            if (unzipResult.stderr) {
                console.warn('解压缩时发生警告:', unzipResult.stderr);
                // 根据需求决定是否抛出错误
                // throw new Error(`解压缩失败: ${unzipResult.stderr}`);
            } else {
                console.log('文件已成功解压到远程服务器。');
            }
        }

        // 执行用户定义的部署命令
        if (commands.length > 0) {
            for (const cmd of commands) {
                console.log(`正在执行远程命令: ${cmd}`);
                const result = await ssh.execCommand(cmd);
                if (result.stderr) {
                    console.warn(`命令 "${cmd}" 执行时发生警告:`, result.stderr);
                    // 根据需求决定是否抛出错误
                    // throw new Error(`命令 "${cmd}" 执行失败: ${result.stderr}`);
                } else {
                    console.log(`命令 "${cmd}" 执行成功:`, result.stdout);
                }
            }
        }

    } catch (err) {
        console.error('SSH 上传和部署过程中发生错误:', err);
        throw err;
    } finally {
        ssh.dispose();
        console.log('SSH 连接已关闭。');
    }
}

module.exports = zipAndUploadBuild;
