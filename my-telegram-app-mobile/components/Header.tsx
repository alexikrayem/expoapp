"use client"

import { useState } from "react"
import { View, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useRouter } from "expo-router"
import { Search, Settings } from "lucide-react-native"
import { useAuth } from "@/context/AuthContext"
import { useModal } from "@/context/ModalContext"
import SearchModal from "./modals/SearchModal"
import PressableScale from "@/components/ui/PressableScale"

export default function Header() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const { openModal } = useModal()
  const [isSearchVisible, setIsSearchVisible] = useState(false)

  const handleProfilePress = () => {
    openModal("profile", { userProfile })
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="bg-white border-b border-border">
      <View className="px-4 py-3 flex-row justify-between items-center">
      {/* Search Modal */}
      <SearchModal visible={isSearchVisible} onClose={() => setIsSearchVisible(false)} openModal={openModal} />

      {/* Left Side: Actions */}
      <View className="flex-row items-center gap-3">
        <PressableScale
          onPress={() => setIsSearchVisible(true)}
          scaleTo={0.96}
          haptic="selection"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border"
        >
          <Search size={20} color="#64748b" />
        </PressableScale>

        <PressableScale
          onPress={() => router.push("/settings")}
          scaleTo={0.96}
          haptic="selection"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border"
        >
          <Settings size={20} color="#64748b" />
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

        <Image source={require("../assets/images/logo.png")} className="h-16 w-16" resizeMode="contain" />
      </View>
      </View>
    </SafeAreaView>
  )
}
