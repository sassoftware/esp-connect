const path = require("path");
const webpack = require("webpack");

const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "../js/connect/entry.js",
  output: {
    path: __dirname + "/../dist",
    filename: "esp-connect-api.js",
    library: "esp_connect",
    libraryTarget: "umd"
  },
  target: "node",
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    ],
  resolve: {
    fallback: {
        "https": false,
        "http": false
    }
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      include: [path.resolve(__dirname, "src")],
      loader: "babel-loader"
    }, {
      test: /.css$/,
      use: [{
        loader: "style-loader"
      }, {
        loader: "css-loader",

        options: {
          sourceMap: true
        }
      }]
    },
    {
         test: /\.(woff|woff2|eot|ttf|otf)$/,
         use: [
           "file-loader",
         ],
       },

    ]
  }
}
