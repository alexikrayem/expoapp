#!/bin/bash

# Build script for Android wrapper

echo "Building Android wrapper for Telegram Web App..."

# Make sure gradlew is executable
chmod +x gradlew

# Build the debug APK
echo "Building debug APK..."
./gradlew assembleDebug

echo "Build completed. APK is located at:"
echo "my-telegram-app-android/app/build/outputs/apk/debug/app-debug.apk"

echo ""
echo "To install on a connected device/emulator, run:"
echo "adb install app/build/outputs/apk/debug/app-debug.apk"