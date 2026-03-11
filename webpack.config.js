const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const isLocal = process.env.LOCAL_DEV === "true";

const config = {
  entry: isLocal ? "./src/local-dev.ts" : "./src/multi-team-sprint.ts",
  output: {
    filename: isLocal ? "local-dev.js" : "multi-team-sprint.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "static/multi-team-sprint.html", to: "multi-team-sprint.html" },
        { from: "images", to: "images" },
      ],
    }),
  ],
  devtool: "source-map",
};

if (isLocal) {
  // In local dev mode, use HtmlWebpackPlugin to auto-inject the bundle
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: "./static/index.html",
      filename: "index.html",
      inject: "body",
    })
  );
  config.devServer = {
    static: {
      directory: path.resolve(__dirname, "dist"),
    },
    port: 3000,
    open: true,
    hot: true,
  };
}

module.exports = config;
