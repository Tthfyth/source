/**
 * Base webpack config used across other specific configs
 */

import webpack from 'webpack';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';
import webpackPaths from './webpack.paths';
import { dependencies as externals } from '../../release/app/package.json';

// 需要作为 externals 的 native 模块 (包含子路径匹配)
const nativeExternalsPatterns = [
  /^onnxruntime-node(\/.*)?$/,
  /^@huggingface\/transformers(\/.*)?$/,
  /^@xmldom\/xmldom(\/.*)?$/,
  /^xpath(\/.*)?$/,
  /^sharp(\/.*)?$/,
];

const configuration: webpack.Configuration = {
  externals: [
    ...Object.keys(externals || {}),
    // 使用函数匹配 native 模块及其子路径
    ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
      if (request && nativeExternalsPatterns.some(pattern => pattern.test(request))) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            compilerOptions: {
              module: 'nodenext',
              moduleResolution: 'nodenext',
            },
          },
        },
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
    // https://github.com/webpack/webpack/issues/1114
    library: { type: 'commonjs2' },
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [webpackPaths.srcPath, 'node_modules'],
    // There is no need to add aliases here, the paths in tsconfig get mirrored
    plugins: [new TsconfigPathsPlugins()],
  },

  plugins: [new webpack.EnvironmentPlugin({ NODE_ENV: 'production' })],
};

export default configuration;
