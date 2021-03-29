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
        new webpack.optimize.LimitChunkCountPlugin(
            {
                maxChunks: 1,
            }
        ),
    ],
    resolve: {
        fallback: {
            "https": false,
            "http": false
        }
    },
    module: {
        rules: [
            {
                test: /\.(mjs|js)$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: [
                            '@babel/plugin-proposal-class-properties'
                        ]
                    }
                }
            }
        ]
    },
    optimization:
    {
        minimizer: [new TerserPlugin()],
    }
}
