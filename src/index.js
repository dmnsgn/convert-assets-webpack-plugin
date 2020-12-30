/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { promisify } from 'util';

import webpack from 'webpack';

import { sync as makeDirSync } from 'mkdirp';
import findCacheDir from 'find-cache-dir';
import prettyBytes from 'pretty-bytes';

// TODO: https://github.com/webpack/schema-utils

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const NAMESPACE = 'convert-cache-asset-webpack-plugin';

const GREEN = '\x1b[32m%s\x1b[0m';

const DEFAULT_CACHE_DIR =
  findCacheDir({ name: NAMESPACE }) || os.homedir() || os.tmpdir();

const DEFAULT_OPTIONS = {
  overrideExtension: true,
  verbose: true,
  cache: true,
  cacheDir: DEFAULT_CACHE_DIR,
};

const requiredOptions = ['test', 'convertBuffer', 'filename'];

class ConvertCacheAssetWebpackPlugin {
  constructor(configs) {
    this.configs = (Array.isArray(configs) ? configs : [configs]).map(
      (config) => {
        const keys = Object.keys(config);
        if (!requiredOptions.every((option) => keys.includes(option))) {
          console.warn(
            `${NAMESPACE} config(s) must contain the required options: ${requiredOptions.join(
              ' '
            )}`
          );
          return false;
        }
        return { ...DEFAULT_OPTIONS, ...config };
      }
    );
  }

  static getCachedAssetPath(buffer, cacheFolder) {
    return path.resolve(
      cacheFolder,
      crypto.createHash('sha1').update(buffer).digest('hex')
    );
  }

  static async getCachedAsset(filePath) {
    try {
      return await readFileAsync(filePath);
    } catch (e) {
      if (e.code === 'EACCES') {
        console.warn(
          `${NAMESPACE} could not read cache file: ${filePath} due to a permission issue.`
        );
      }
      return false;
    }
  }

  static async setCachedAsset(filePath, buffer) {
    try {
      makeDirSync(path.dirname(filePath));
      await writeFileAsync(filePath, buffer);
    } catch (e) {
      switch (e.code) {
        case 'ENOENT':
        case 'EACCES':
        case 'EPERM':
          console.warn(
            `${NAMESPACE} could not write cache to file: ${filePath} due to a permission issue.`
          );
          break;
        case 'EROFS':
          console.warn(
            `${NAMESPACE} could not write cache to file: ${filePath} because it resides in a readonly filesystem.`
          );
          break;
        default:
          throw e;
      }
    }
  }

  static getDelta(buffer, convertedBuffer) {
    return (buffer.length - convertedBuffer.length) / 1000;
  }

  apply(compiler) {
    const processCompilation = async (compilation, assets) =>
      this.addAssets(compilation, assets)
        .then((deltas) => {
          console.log(
            `${NAMESPACE} ${prettyBytes(
              deltas.flat().reduce((acc, cur) => acc + cur, 0)
            )}`
          );
        })
        .catch((error) => compilation.errors.push(error));

    if (webpack.version.startsWith('4.')) {
      compiler.hooks.emit.tapPromise(NAMESPACE, (compilation) =>
        processCompilation(compilation, compilation.assets)
      );
    } else {
      compiler.hooks.thisCompilation.tap(NAMESPACE, (compilation) => {
        compilation.hooks.processAssets.tapPromise(
          {
            name: NAMESPACE,
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            addiontalAssets: true,
          },
          (assets) => processCompilation(compilation, assets)
        );
      });
    }
  }

  async addAssets(compilation, assets) {
    return Promise.all(
      Object.entries(assets).map(async ([name, asset]) => {
        const buffer = asset.source();

        return Promise.all(
          this.configs.map(async (config) => {
            if (config.test.test(name)) {
              // Compute file name
              let convertedAssetName = name;

              if (config.overrideExtension) {
                convertedAssetName = name.split('.').slice(0, -1).join('.');
              }
              convertedAssetName = config.filename(convertedAssetName);

              // Check cache first
              let filePath;
              let convertedBuffer;
              let logMessage = '';

              if (config.cache) {
                filePath = ConvertCacheAssetWebpackPlugin.getCachedAssetPath(
                  buffer,
                  config.cacheDir
                );
                convertedBuffer = await ConvertCacheAssetWebpackPlugin.getCachedAsset(
                  filePath
                );
              }

              // Convert if not in cache
              if (!convertedBuffer) {
                convertedBuffer = await config.convertBuffer(buffer);

                if (config.cache) {
                  await ConvertCacheAssetWebpackPlugin.setCachedAsset(
                    filePath,
                    convertedBuffer
                  );
                }
              } else if (config.verbose) {
                logMessage += ` (cache)`;
              }

              // Add converted asset to compilation assets
              // eslint-disable-next-line no-param-reassign
              compilation.assets[convertedAssetName] = {
                source: () => convertedBuffer,
                size: () => convertedBuffer.length,
              };

              // Compute difference
              const delta = ConvertCacheAssetWebpackPlugin.getDelta(
                buffer,
                convertedBuffer
              );
              if (config.verbose) {
                logMessage += ` ${name} -> ${convertedAssetName}: ${prettyBytes(
                  delta,
                  { signed: true }
                )}`;
                console.log(GREEN, logMessage);
              }

              return Promise.resolve(delta);
            }

            return Promise.resolve(0);
          })
        );
      })
    );
  }
}

export default ConvertCacheAssetWebpackPlugin;
