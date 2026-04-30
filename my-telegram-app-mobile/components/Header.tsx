"use client"

import { useCallback, useMemo, useState } from "react"
import { View, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useRouter, useSegments } from "expo-router"
import { Search, Settings } from "lucide-react-native"
import { useAuth } from "@/context/AuthContext"
import { useModal } from "@/context/ModalContext"
import SearchModal from "./modals/SearchModal"
import PressableScale from "@/components/ui/PressableScale"
import { userService } from "@/services/userService"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoImage = require("../assets/images/logo.png")

export default function Header() {
  const router = useRouter()
  const segments = useSegments()
  const { userProfile, refreshProfile } = useAuth()
  const { openModal } = useModal()
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const isSettingsRoute = useMemo(() => segments[segments.length - 1] === "settings", [segments])

  const handleProfilePress = useCallback(() => {
    openModal("profile", {
      telegramUser: userProfile,
      userProfile,
      onSave: async (updatedData: any) => {
        await userService.updateProfile(updatedData)
        await refreshProfile()
      },
    })
  }, [openModal, userProfile, refreshProfile])

  const handleSearchOpen = useCallback(() => setIsSearchVisible(true), [])
  const handleSearchClose = useCallback(() => setIsSearchVisible(false), [])

  const handleSettingsPress = useCallback(() => {
    if (isSettingsRoute) return
    router.push("/settings")
  }, [isSettingsRoute, router])

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="bg-white border-b border-border">
      <View className="px-4 py-3 flex-row justify-between items-center">
      {/* Search Modal */}
      {isSearchVisible ? <SearchModal visible={true} onClose={handleSearchClose} openModal={openModal} /> : null}

      {/* Left Side: Actions */}
      <View className="flex-row items-center gap-3">
        <PressableScale
          onPress={handleSearchOpen}
          scaleTo={0.96}
          haptic="selection"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border"
        >
          <Search size={20} color="#64748b" />
        </PressableScale>

        <PressableScale
          onPress={handleSettingsPress}
          scaleTo={0.96}
          haptic="selection"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className={`w-10 h-10 rounded-xl items-center justify-center border ${
            isSettingsRoute ? "bg-gray-100 border-gray-200" : "bg-surface border-border"
          }`}
        >
          <Settings size={20} color={isSettingsRoute ? "#94a3b8" : "#64748b"} />
        </PressableScale>

        <PressableScale
          onPress={handleProfilePress}
          scaleTo={0.96}
          haptic="selection"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border overflow-hidden"
        >
          {userProfile?.photo_url ? (
            <Image source={{ uri: userProfile.photo_url }} className="w-full h-full" />
          ) : (
            <Text className="text-primary-600 font-bold text-lg">{userProfile?.full_name?.charAt(0) || "U"}</Text>
          )}
        </PressableScale>
      </View>

      {/* Right Side: Logo & Custom Typography */}
      <View className="flex-row items-center gap-2">
        <View className="flex-col items-end justify-center space-y-1 pt-1">
          <Text className="text-[22px] text-gray-900 leading-none" style={{ fontFamily: "MontserratArabic_Bold" }}>
            طبيب
          </Text>

          <Text
            className="text-[22px] text-gray-900 leading-none tracking-tight"
            style={{ fontFamily: "Montserrat_Bold" }}
          >
            Tabeeb
          </Text>
        </View>

        <Image source={logoImage} className="h-16 w-16" resizeMode="contain" />
      </View>
      </View>
    </SafeAreaView>
  )
}
