# Android Wrapper for Telegram Web App

This Android wrapper allows you to run your Telegram web app as a native Android application.

## Prerequisites

- Android Studio (latest version recommended)
- Android SDK with API level 24 or higher
- Your Telegram web app running locally (e.g., on port 5173 via Vite)

## Setup Instructions

1. **Prepare Your Web App URL**
   - Ensure your Telegram web app is running and accessible
   - For development: typically `http://localhost:5173`
   - For testing on Android emulator: use `http://10.0.2.2:5173`
   - For testing on physical device: use your local machine's IP address

2. **Update the App URL**
   - Edit `MainActivity.java` and update the `telegramAppUrl` in the `loadTelegramWebApp()` method
   - Example: `"http://192.168.1.100:5173"` (replace with your actual IP and port)

3. **Build the Project**
   - Open this project in Android Studio
   - Sync the project with Gradle files
   - Build the project using `Build > Make Project`

## Running the App

### For Emulator
1. Open Android Studio
2. Select an emulator device
3. Click Run button (green triangle)

### For Physical Device
1. Enable USB debugging on your Android device
2. Connect your device via USB
3. Click Run button in Android Studio

## Configuration Notes

- The app is configured to mimic the Telegram app experience with fullscreen mode
- Web view settings are optimized for Telegram Web App compatibility
- A JavaScript interface is provided for native functionality

## Troubleshooting

- **App won't load**: Check that your web app is running and accessible at the specified URL
- **Mixed content issues**: Ensure your web app is served over HTTP (for local development) or HTTPS (for production)
- **CORS issues**: Configure your web server to allow requests from the Android app
- **JavaScript unavailable**: Verify JavaScript is enabled in WebView settings

## Permissions Used

- `INTERNET`: To load your web app
- `ACCESS_NETWORK_STATE`: To check network status
- `WAKE_LOCK`: To keep screen on when needed

## Customization

You can customize:
- App name and icons in `strings.xml` and `res/mipmap-*` directories
- Colors in `colors.xml`
- App behavior in `MainActivity.java`
- Telegram-specific functionality in `WebAppInterface.java`

## Deployment

For production deployment:
1. Update the app URL to your production web app
2. Sign the APK with your keystore
3. Build a release APK using `Build > Generate Signed Bundle / APK`