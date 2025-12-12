"use client"

import { useState } from "react"
import { View, TouchableOpacity, Image } from "react-native"
import Text from "@/components/ThemedText"
import { useRouter } from "expo-router"
import { Search, Settings } from "lucide-react-native"
import { useAuth } from "@/context/AuthContext"
import { useModal } from "@/context/ModalContext"
import SearchModal from "./modals/SearchModal"

export default function Header() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const { openModal } = useModal()
  const [isSearchVisible, setIsSearchVisible] = useState(false)

  const handleProfilePress = () => {
    openModal("profile", { userProfile })
  }

  return (
    <View className="bg-white pt-[60px] pb-4 px-4 shadow-sm flex-row justify-between items-center z-50 border-b border-border">
      {/* Search Modal */}
      <SearchModal visible={isSearchVisible} onClose={() => setIsSearchVisible(false)} openModal={openModal} />

      {/* Left Side: Actions */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => setIsSearchVisible(true)}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border active:bg-primary-50"
        >
          <Search size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border active:bg-primary-50"
        >
          <Settings size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProfilePress}
          className="w-10 h-10 bg-surface rounded-xl items-center justify-center border border-border overflow-hidden active:opacity-80"
        >
          {userProfile?.photo_url ? (
            <Image source={{ uri: userProfile.photo_url }} className="w-full h-full" />
          ) : (
            <Text className="text-primary-600 font-bold text-lg">{userProfile?.full_name?.charAt(0) || "U"}</Text>
          )}
        </TouchableOpacity>
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

        <Image source={require("../assets/images/logo.png")} className="h-20 w-20" resizeMode="contain" />
      </View>
    </View>
  )
}
