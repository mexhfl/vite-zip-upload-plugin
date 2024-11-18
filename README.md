# vite-zip-upload-plugin

`vite-zip-upload-plugin` 是一个用于 Vite 项目的插件，能够在构建完成后自动打包构建产物并将其上传到远程服务器进行部署。该插件简化了构建和部署流程，提高了开发效率。

## 功能

- **自动打包**：在 Vite 构建完成后，自动将构建产物压缩成 ZIP 文件。
- **自动上传**：将压缩包通过 SSH 上传到指定的远程服务器。
- **自动部署**：在远程服务器上解压缩上传的文件，并执行用户自定义的部署命令。
- **灵活配置**：支持多种配置选项，满足不同项目的需求。
- **回调函数**：支持在打包和部署成功或失败时执行自定义回调函数。

## 安装

使用 npm 安装插件：

```bash
npm install vite-zip-upload-plugin --save-dev
```

或使用 yarn：

```bash
yarn add vite-zip-upload-plugin --dev
```

## 使用方法

在 Vite 配置文件 (`vite.config.js` 或 `vite.config.ts`) 中引入并配置插件。

### 引入插件

```javascript
import { defineConfig } from 'vite';
import zipAndUploadBuild from 'vite-zip-upload-plugin';

export default defineConfig({
  plugins: [
    zipAndUploadBuild(
      {
        // 打包相关配置
        enable: true, // 是否执行打包
        localDir: 'dist', // 本地构建目录
        zipFileName: 'build.zip', // 压缩包名称
        onSuccess: () => {
          console.log('打包操作成功完成。');
        },
        onError: (err) => {
          console.error('打包操作失败:', err);
        }
      },
      {
        // 上传和部署相关配置
        enable: true, // 是否执行上传和部署
        host: '172.16.20.206', // SSH 主机地址
        port: 22, // SSH 端口
        username: 'root', // SSH 用户名
        password: '', // SSH 密码（推荐使用私钥）
        privateKey: 'C:\\Users\\Administrator\\.ssh\\id_rsa', // SSH 私钥路径或内容
        remoteZipPath: '/www/build.zip', // 远程服务器上的 ZIP 文件路径
        remoteUnzipDir: '/www/app', // 远程服务器上的解压目录
        commands: [
          'rm -rf /www/app/*', // 清理旧文件
          'unzip /www/build.zip -d /www/app' // 解压新文件
        ],
        onSuccess: () => {
          console.log('上传和部署操作成功完成。');
        },
        onError: (err) => {
          console.error('上传或部署操作失败:', err);
        }
      }
    )
  ]
});
```

### 配置选项说明

#### 打包相关配置 (`packageOptions`)

| 选项            | 类型      | 默认值       | 描述                                      |
| --------------- | --------- | ------------ | ----------------------------------------- |
| `enable`        | `boolean` | `true`       | 是否执行打包步骤。                         |
| `localDir`      | `string`  | `'dist'`     | 本地构建产物所在目录。                     |
| `zipFileName`   | `string`  | `'build.zip'`| 压缩包的名称。                             |
| `onSuccess`     | `Function`| `-`          | 打包成功后的回调函数。                     |
| `onError`       | `Function`| `-`          | 打包失败后的回调函数。                     |

#### 上传和部署相关配置 (`deployOptions`)

| 选项               | 类型          | 默认值            | 描述                                      |
| ------------------ | ------------- | ----------------- | ----------------------------------------- |
| `enable`           | `boolean`     | `false`           | 是否执行上传和部署步骤。                   |
| `host`             | `string`      | `-`               | SSH 主机地址。                             |
| `port`             | `number`      | `22`              | SSH 端口。                                 |
| `username`         | `string`      | `-`               | SSH 用户名。                               |
| `password`         | `string`      | `-`               | SSH 密码。推荐使用 `privateKey`。           |
| `privateKey`       | `string`      | `-`               | SSH 私钥路径或私钥内容。                    |
| `remoteZipPath`    | `string`      | `-`               | 远程服务器上的 ZIP 文件路径。               |
| `remoteUnzipDir`   | `string`      | `-`               | 远程服务器上的解压目录路径。                |
| `commands`         | `Array<string>`| `[]`             | 用户定义的部署命令列表。                    |
| `onSuccess`        | `Function`    | `-`              | 上传和部署成功后的回调函数。                 |
| `onError`          | `Function`    | `-`              | 上传和部署失败后的回调函数。                 |

### 使用案例

以下是一个完整的 Vite 配置示例，展示如何使用 `vite-zip-upload-plugin` 插件进行打包、上传和部署。

```javascript
import { defineConfig } from 'vite';
import zipAndUploadBuild from 'vite-zip-upload-plugin';

export default defineConfig({
  plugins: [
    zipAndUploadBuild(
      {
        enable: true,
        localDir: 'dist',
        zipFileName: 'build.zip',
        onSuccess: () => {
          console.log('打包操作成功完成。');
        },
        onError: (err) => {
          console.error('打包操作失败:', err);
        }
      },
      {
        enable: true,
        host: '172.16.20.206',
        port: 22,
        username: 'root',
        password: '',
        privateKey: 'C:\\Users\\Administrator\\.ssh\\id_rsa',
        remoteZipPath: '/www/build.zip',
        remoteUnzipDir: '/www/app',
        commands: [
          'rm -rf /www/app/*',
          'unzip /www/build.zip -d /www/app'
        ],
        onSuccess: () => {
          console.log('上传和部署操作成功完成。');
        },
        onError: (err) => {
          console.error('上传或部署操作失败:', err);
        }
      }
    )
  ]
});
```

### 注意事项

- **SSH 配置**：建议使用 SSH 私钥进行认证，以提高安全性。确保私钥路径正确，且远程服务器已配置对应的公钥。
- **权限**：确保执行部署命令的用户具有相应的权限，如删除目录内容、解压文件等。
- **远程命令**：根据项目需求，自定义部署命令，确保部署过程符合预期。

## 开源协议

本项目基于 [MIT 协议](./LICENSE)。

## 贡献

欢迎提交 issue 或 pull request 来贡献代码或报告问题！

## 联系方式

如有任何问题或建议，请通过 [GitHub Issues](https://github.com/your-repo/vite-zip-upload-plugin/issues) 联系我们。

---
