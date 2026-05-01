/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Prevent Metro from resolving duplicate packages from parent node_modules in this repo.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = withNativeWind(config, { input: "./global.css" });
