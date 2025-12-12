"use client"

import { useState } from "react"
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Image,
  I18nManager,
} from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useAuth } from "@/context/AuthContext"
import { Redirect } from "expo-router"
import { FontAwesome } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import TelegramLoginWebView from "@/components/TelegramLoginWebView"
import { authService } from "@/services/authService"
import { setTokens } from "@/api/apiClient"

const { width, height } = Dimensions.get("window")
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const getServerBaseUrl = () => {
  const apiUrl = API_BASE_URL || ""
  return apiUrl.replace(/\/api\/?$/, "")
}

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading, refreshAuth } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showWebView, setShowWebView] = useState(false)

  if (isLoading) {
    // You can return null or a simple loading indicator here
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  const handleLoginSuccess = async (userData: any) => {
    setShowWebView(false)
    setIsLoggingIn(true)
    try {
      console.log("[v0] handleLoginSuccess called with userData:", JSON.stringify(userData))

      // Check if we received full auth result (Web Handoff) containing tokens
      if (userData.accessToken && userData.refreshToken) {
        console.log("[v0] Direct token handoff from Web App detected")
        await setTokens(userData.accessToken, userData.refreshToken)
      } else {
        // Standard flow: Exchange Telegram data for tokens
        await authService.telegramLoginWidget(userData)
      }

      console.log("[v0] Calling refreshAuth...")
      await refreshAuth()
      console.log("[v0] refreshAuth completed")
    } catch (error) {
      console.error("[v0] Login error:", error)
      Alert.alert("فشل تسجيل الدخول", "حدث خطأ أثناء تسجيل الدخول.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const BACKGROUND_IMAGE =
    "https://images.unsplash.com/photo-1588774063686-cc7f1d1b6b6d?auto=format&fit=crop&w=1400&q=90"

  const PROFILE_IMG = "https://picsum.photos/id/237/300/300"
  const isRTL = I18nManager.isRTL

  // Determine Web App URL
  // If API is running on localhost:3001, assume Web App is on localhost:5173
  const getWebAppUrl = () => {
    const apiBase = getServerBaseUrl();
    if (apiBase.includes("3001")) {
      return apiBase.replace("3001", "5173").replace("/api", "");
    }
    // Production / Remote assumption
    return apiBase;
  };

  const widgetUrl = `${getWebAppUrl()}/login`
  console.log("[v0] Web Login URL:", widgetUrl)

  return (
    <View style={styles.container}>
      <TelegramLoginWebView
        visible={showWebView}
        onClose={() => setShowWebView(false)}
        onLoginSuccess={handleLoginSuccess}
        widgetUrl={widgetUrl}
      />

      {/* Full background */}
      <Image source={require("../assets/images/IMG_1787.jpg")} style={styles.backgroundImage} />

      {/* Gradient overlay from bottom */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,1)", // strong white
          "rgba(255,255,255,0.97)",
          "rgba(255,255,255,0.92)",
          "rgba(255,255,255,0.75)",
          "rgba(255,255,255,0.20)", // fade starts near middle
          "rgba(255,255,255,0)", // fully transparent
        ]}
        locations={[0, 0.05, 0.15, 0.35, 0.5, 1]} // <-- reaches mid screen
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[styles.bottomFade, { height: height * 0.9 }]} // <--- extend upward
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* Avatar + Text */}
          <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Image source={require("../assets/images/logo.png")} style={styles.avatar} />

            <View style={[styles.textBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.title, isRTL && { textAlign: "right" }]}>أهلاً بك في المعرض الطبي</Text>

              <Text style={[styles.subtitle, isRTL && { textAlign: "right" }]}>
                سجّل الدخول للوصول لمنتجات طبية عالية الجودة وعروض مميزة.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => setShowWebView(true)}
            disabled={isLoggingIn}
            activeOpacity={0.88}
            style={styles.button}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.buttonContent}>
                <FontAwesome name="telegram" size={20} color="#FFF" />
                <Text style={styles.buttonText}>تسجيل الدخول عبر تيليجرام</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            يجب أن يكون تطبيق <Text style={{ fontWeight: "700", color: "#0284c7" }}>تيليجرام</Text> مثبتاً على جهازك.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  safeArea: { flex: 1, justifyContent: "flex-end" },

  // gradient overlay
  bottomFade: {
    position: "absolute",
    bottom: 0,
    height: height * 0.55,
    width: "100%",
  },

  // content floats on the gradient
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 28,
  },

  // avatar + text
  row: {
    alignItems: "center",
    gap: 16,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },

  textBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },

  // Modern CTA button
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },

  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    color: "#475569",
    opacity: 0.8,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    zIndex: -1, // ensures it stays behind the card
  },
})
