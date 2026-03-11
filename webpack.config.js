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
    // Required for Azure DevOps extension iframe
    devtoolNamespace: "multi-team-sprint-view",
  },
  resolve: {
    extensions: [".ts", ".js"],
    // Force single copy of the SDK to prevent "already loaded" error
    alias: {
      "azure-devops-extension-sdk": path.resolve(
        __dirname,
        "node_modules/azure-devops-extension-sdk"
      ),
    },
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
