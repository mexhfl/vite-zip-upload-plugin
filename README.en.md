# vite-zip-upload-plugin

`vite-zip-upload-plugin` is a Vite plugin designed to automatically zip build artifacts after the build process and upload them to a remote server for deployment. This plugin streamlines the build and deployment workflow, enhancing development efficiency.

## Features

- **Automatic Zipping**: Compresses build artifacts into a ZIP file after the Vite build process.
- **Automatic Uploading**: Transfers the ZIP file to a specified remote server via SSH.
- **Automatic Deployment**: Extracts the uploaded ZIP file on the remote server and executes user-defined deployment commands.
- **Flexible Configuration**: Offers various configuration options to cater to different project needs.
- **Callback Functions**: Allows execution of custom callback functions upon successful or failed packaging and deployment.

## Installation

Install the plugin using npm:

```bash
npm install vite-zip-upload-plugin --save-dev
```

Or using yarn:

```bash
yarn add vite-zip-upload-plugin --dev
```

## Usage

Import and configure the plugin in your Vite configuration file (`vite.config.js` or `vite.config.ts`).

### Importing the Plugin

```javascript
import { defineConfig } from 'vite';
import zipAndUploadBuild from 'vite-zip-upload-plugin';

export default defineConfig({
  plugins: [
    zipAndUploadBuild(
      {
        // Packaging options
        enable: true, // Whether to perform packaging
        localDir: 'dist', // Local build directory
        zipFileName: 'build.zip', // Name of the ZIP file
        onSuccess: () => {
          console.log('Packaging completed successfully.');
        },
        onError: (err) => {
          console.error('Packaging failed:', err);
        }
      },
      {
        // Upload and deployment options
        enable: true, // Whether to perform upload and deployment
        host: '172.16.20.206', // SSH host address
        port: 22, // SSH port
        username: 'root', // SSH username
        password: '', // SSH password (recommended to use privateKey)
        privateKey: 'C:\\Users\\Administrator\\.ssh\\id_rsa', // SSH private key path or content
        remoteZipPath: '/www/build.zip', // Path to the ZIP file on the remote server
        remoteUnzipDir: '/www/app', // Directory to unzip the files on the remote server
        commands: [
          'rm -rf /www/app/*', // Remove existing files
          'unzip /www/build.zip -d /www/app' // Unzip new files
        ],
        onSuccess: () => {
          console.log('Upload and deployment completed successfully.');
        },
        onError: (err) => {
          console.error('Upload or deployment failed:', err);
        }
      }
    )
  ]
});
```

### Configuration Options

#### Packaging Options (`packageOptions`)

| Option         | Type       | Default        | Description                                    |
| -------------- | ---------- | -------------- | ---------------------------------------------- |
| `enable`       | `boolean`  | `true`         | Whether to perform the packaging step.         |
| `localDir`     | `string`   | `'dist'`       | The local directory containing build artifacts.|
| `zipFileName`  | `string`   | `'build.zip'`  | The name of the generated ZIP file.            |
| `onSuccess`    | `Function` | `-`            | Callback function executed upon successful packaging.|
| `onError`      | `Function` | `-`            | Callback function executed upon packaging failure.|

#### Upload and Deployment Options (`deployOptions`)

| Option            | Type            | Default         | Description                                         |
| ----------------- | --------------- | --------------- | --------------------------------------------------- |
| `enable`          | `boolean`       | `false`         | Whether to perform upload and deployment steps.     |
| `host`            | `string`        | `-`             | SSH host address.                                   |
| `port`            | `number`        | `22`            | SSH port number.                                    |
| `username`        | `string`        | `-`             | SSH username.                                       |
| `password`        | `string`        | `-`             | SSH password. It is recommended to use `privateKey`. |
| `privateKey`      | `string`        | `-`             | SSH private key path or content.                    |
| `remoteZipPath`   | `string`        | `-`             | Path to the ZIP file on the remote server.          |
| `remoteUnzipDir`  | `string`        | `-`             | Directory to unzip the files on the remote server.  |
| `commands`        | `Array<string>` | `[]`            | List of user-defined deployment commands.           |
| `onSuccess`       | `Function`      | `-`             | Callback function executed upon successful upload and deployment.|
| `onError`         | `Function`      | `-`             | Callback function executed upon upload or deployment failure.|

### Usage Example

Below is a complete Vite configuration example demonstrating how to use the `vite-zip-upload-plugin` for packaging, uploading, and deploying your build artifacts.

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
          console.log('Packaging completed successfully.');
        },
        onError: (err) => {
          console.error('Packaging failed:', err);
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
          console.log('Upload and deployment completed successfully.');
        },
        onError: (err) => {
          console.error('Upload or deployment failed:', err);
        }
      }
    )
  ]
});
```

### Important Considerations

- **SSH Configuration**: It is recommended to use SSH keys for authentication to enhance security. Ensure that the private key path is correct and that the remote server has the corresponding public key configured.
- **Permissions**: Ensure that the user executing the deployment commands has the necessary permissions, such as deleting directory contents and extracting files.
- **Remote Commands**: Customize the deployment commands according to your project's requirements to ensure the deployment process behaves as expected.

## License

This project is licensed under the [MIT License](./LICENSE).

## Contributing

Feel free to submit issues or pull requests to contribute to the project or report any problems!

## Contact

If you have any questions or suggestions, please reach out via [GitHub Issues](https://github.com/your-repo/vite-zip-upload-plugin/issues).