module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            // Must be last (Reanimated/Worklets requirement).
            "react-native-worklets/plugin",
             "react-native-reanimated/plugin", 
        ],
    };
};
