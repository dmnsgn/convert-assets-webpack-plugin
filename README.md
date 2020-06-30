<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

# convert-assets-webpack-plugin

Convert compiled files buffer loaded by webpack using any package and choosing their output location.

## Getting Started

To begin, you'll need to install `convert-assets-webpack-plugin`:

```console
$ npm install convert-assets-webpack-plugin --save-dev
```

Then add the plugin to your `webpack` config. For example:

**webpack.config.js**

```js
const ConvertAssetsPlugin = require('convert-assets-webpack-plugin');

module.exports = {
  plugins: [new ConvertAssetsPlugin()],
};
```

And run `webpack` via your preferred method.

## Options

You can pass an object with the following options or an array of them.

|                 Name                  |                   Type                    |                       Default                       | Description                                                                                         |
| :-----------------------------------: | :---------------------------------------: | :-------------------------------------------------: | :-------------------------------------------------------------------------------------------------- |
|          **[`test`](#test)**          | `{String\|RegExp\|Array<String\|RegExp>}` |                     `undefined`                     | Include all assets that pass test assertion                                                         |
|      **[`filename`](#filename)**      |               `{Function}`                |                     `undefined`                     | The conversion generated filename.                                                                  |
| **[`convertBuffer`](#convertBuffer)** |               `{Function}`                |                     `undefined`                     | The conversion async function taking the file Buffer as input and must return the converted Buffer. |
|       **[`verbose`](#verbose)**       |                `{Boolean}`                |                       `false`                       | Log which files are being converted.                                                                |
|         **[`cache`](#cache)**         |                `{Boolean}`                |                       `true`                        | Enable file caching.                                                                                |
|      **[`cacheDir`](#cacheDir)**      |                `{String}`                 | `node_modules/.cache/convert-assets-webpack-plugin` | Change cache directory.                                                                             |

### `test`

Type: `String|RegExp|Array<String|RegExp>`
Default: `undefined`

Include all assets that pass test assertion.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      test: /\.(jpe?g|png)/,
      filename: (name) => `${name}.webp`,
      verbose: process.env.NODE_ENV === 'production',
      async convertBuffer(buffer) {
        return await imagemin.buffer(buffer, {
          plugins: [
            webp({
              preset: 'drawing',
              quality: 85,
              method: 6,
            }),
          ],
        });
      },
    }),
  ],
};
```

### `filename`

Type: `Function`

The conversion generated filename.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      filename: (name) => `${name}.webp`,
    }),
  ],
};
```

### `convertBuffer`

Type: `AsyncFunction`

The conversion async function taking the file Buffer as input and must return the converted Buffer.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      async convertBuffer(buffer) {
        return await myLib.buffer(buffer);
      },
    }),
  ],
};
```

### `verbose`

Type: `Boolean`
Default: `false`

Log which files are being converted.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      verbose: process.env.NODE_ENV === 'production',
    }),
  ],
};
```

### `cache`

Type: `Boolean`
Default: `true`

Enable/disable file caching.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      cache: true,
    }),
  ],
};
```

### `cacheDir`

Type: `Boolean`
Default: `String`

Change cache directory. The default path to cache directory: `node_modules/.cache/convert-assets-webpack-plugin`.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new ConvertAssetsPlugin({
      cacheDir: 'my_cache/assets',
    }),
  ],
};
```

## License

[MIT](./LICENSE)
