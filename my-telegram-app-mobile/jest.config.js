module.exports = {
    preset: "jest-expo",
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(?!-)|@expo(?!-)|.*expo-.*|native-base|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-notify|@shopify/flash-list|lucide-react-native)",
    ],
    setupFilesAfterEnv: ["./jest.setup.js"],
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.{ts,tsx}",
        "!**/coverage/**",
        "!**/node_modules/**",
        "!**/babel.config.js",
        "!**/jest.setup.js",
    ],
};
