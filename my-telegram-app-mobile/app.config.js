/**
 * Expo App Configuration (Dynamic)
 *
 * Converted from static app.json to enable:
 *  - Per-build-profile bundle identifiers (via APP_VARIANT env)
 *  - Runtime iOS privacy manifest declarations
 *  - Automatic buildNumber / versionCode management
 *  - Dark-mode splash screen support
 *
 * @see https://docs.expo.dev/versions/latest/config/app/
 */

const IS_DEV = process.env.APP_VARIANT === "development"
const IS_PREVIEW = process.env.APP_VARIANT === "preview"

const getBundleId = () => {
    if (IS_DEV) return "com.mytelegramapp.mobile.dev"
    if (IS_PREVIEW) return "com.mytelegramapp.mobile.preview"
    return "com.mytelegramapp.mobile"
}

const getAppName = () => {
    if (IS_DEV) return "DentApp (Dev)"
    if (IS_PREVIEW) return "DentApp (Preview)"
    return "DentApp"
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
    name: getAppName(),
    slug: "my-telegram-app-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mytelegramappmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#0f172a",
        },
    },

    ios: {
        bundleIdentifier: getBundleId(),
        buildNumber: "1",
        supportsTablet: true,
        infoPlist: {
            // Apple Privacy Manifest — declare accessed API reasons
            // @see https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
            NSPrivacyAccessedAPITypes: [
                {
                    NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
                    NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
                },
                {
                    NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
                    NSPrivacyAccessedAPITypeReasons: ["C617.1"],
                },
            ],
        },
    },

    android: {
        package: getBundleId(),
        versionCode: 1,
        adaptiveIcon: {
            foregroundImage: "./assets/images/adaptive-icon.png",
            backgroundColor: "#ffffff",
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
    },

    web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png",
    },

    plugins: ["expo-router", "expo-secure-store"],

    experiments: {
        typedRoutes: true,
    },
}

export default { expo: config }
