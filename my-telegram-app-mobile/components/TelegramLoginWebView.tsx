"use client"

import { useState, useRef } from "react"
import { View, Modal, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from "react-native"
import { WebView, type WebViewNavigation } from "react-native-webview"
import Text from "@/components/ThemedText"
import { X } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface TelegramLoginWebViewProps {
  visible: boolean
  onClose: () => void
  onLoginSuccess: (userData: any) => void
  widgetUrl: string
}

export default function TelegramLoginWebView({
  visible,
  onClose,
  onLoginSuccess,
  widgetUrl,
}: TelegramLoginWebViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const webViewRef = useRef<WebView>(null)
  const insets = useSafeAreaInsets()

  console.log("[v0] TelegramLoginWebView rendered, widgetUrl:", widgetUrl)

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState
    console.log("[v0] WebView navigation:", url)

    // Check if the URL contains our auth callback with user data
    if (url.includes("auth-callback") || url.includes("mytelegramappmobile://auth")) {
      console.log("[v0] Auth callback detected in URL!")
      try {
        // Parse the URL to extract user data
        const urlObj = new URL(url.replace("mytelegramappmobile://", "https://"))
        const userParam = urlObj.searchParams.get("user")

        if (userParam) {
          const userData = JSON.parse(decodeURIComponent(userParam))
          console.log("[v0] Parsed userData from URL:", userData)
          onLoginSuccess(userData)
        }
      } catch (error) {
        console.error("[v0] Failed to parse auth callback:", error)
      }
    }
  }

  const handleMessage = (event: any) => {
    console.log("[v0] WebView message received:", event.nativeEvent.data)
    try {
      const data = JSON.parse(event.nativeEvent.data)

      if (data.type === "telegram_auth" && data.user) {
        console.log("[v0] Telegram auth data received:", data.user)
        onLoginSuccess(data.user)
      }

      if (data.type === "open_external" && data.url) {
        console.log("[v0] Opening external URL:", data.url)
        Linking.openURL(data.url)
      }
    } catch (error) {
      console.error("[v0] Failed to parse message:", error)
    }
  }

  // Inject JavaScript to capture Telegram login callback
  const injectedJavaScript = `
        (function() {
            // Override the Telegram callback to send data to React Native
            window.onTelegramAuth = function(user) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'telegram_auth',
                    user: user
                }));
            };
            
            // Also try to intercept if the widget uses a different pattern
            if (window.TelegramLoginWidget) {
                var originalCallback = window.TelegramLoginWidget.dataOnauth;
                window.TelegramLoginWidget.dataOnauth = function(user) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'telegram_auth',
                        user: user
                    }));
                    if (originalCallback) originalCallback(user);
                };
            }
            true;
        })();
    `

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تسجيل الدخول عبر تيليجرام</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0088cc" />
              <Text style={styles.loadingText}>جاري التحميل...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: widgetUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleMessage}
            injectedJavaScript={injectedJavaScript}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            originWhitelist={["*"]}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "TajawalCustom",
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontFamily: "TajawalCustom",
  },
})
