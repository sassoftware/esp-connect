const path = require("path");
const webpack = require("webpack");

const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "../js/ui/entry.js",
  output: {
    path: __dirname + "/../dist",
    filename: "esp-connect-ui.js",
    library: "esp_connect_ui",
    libraryTarget: "umd"
  },
  target: "web",
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
  node: false,
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
    }
    ]
  },
  optimization: {
    minimizer: [new TerserPlugin()],
  }
}
