import React from "react"
import { ActivityIndicator, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

import Text from "@/components/ThemedText"

interface LoadingScreenProps {
  title?: string
  message?: string
}

export default function LoadingScreen({
  title = "My Telegram App",
  message = "جاري التحميل...",
}: LoadingScreenProps) {
  return (
    <LinearGradient
      colors={["#f8fafc", "#eef2ff", "#ffffff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center rounded-2xl bg-white/70 px-8 py-7 border border-white/60 shadow-sm">
          <Text className="text-2xl font-bold text-text-main text-center">{title}</Text>
          <Text className="text-sm text-text-secondary mt-2 text-center">{message}</Text>
          <ActivityIndicator className="mt-6" size="large" color="#2563eb" />
        </View>
      </View>
    </LinearGradient>
  )
}

