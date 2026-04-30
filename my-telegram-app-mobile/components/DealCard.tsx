"use client"

import React, { useCallback } from "react"
import { View, StyleSheet, Pressable } from "react-native"
import { Image } from "expo-image"
import Text from "@/components/ThemedText"
import { Tag, Clock, ArrowRight } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { IMAGE_PLACEHOLDER_BLURHASH } from "@/utils/image"

interface DealCardProps {
  deal: any
  onShowDetails: (dealId: string) => void
}

const DealCard = React.memo(
  ({ deal, onShowDetails }: DealCardProps) => {
    const handlePress = useCallback(() => {
      onShowDetails(deal.id)
    }, [onShowDetails, deal.id])

    const dealImageUrl = deal.imageUrl || deal.image_url
    const discountPercent = Number(deal.discountPercentage ?? deal.discount_percentage ?? 0)
    const rawDaysRemaining = deal.daysRemaining ?? deal.days_remaining
    const endDateValue = deal.endDate || deal.end_date
    const computedDaysRemaining =
      rawDaysRemaining !== undefined && rawDaysRemaining !== null
        ? Number(rawDaysRemaining)
        : (() => {
            if (!endDateValue) return 0
            const endTimestamp = new Date(endDateValue).getTime()
            if (!Number.isFinite(endTimestamp)) return 0
            const dayMs = 24 * 60 * 60 * 1000
            return Math.max(0, Math.ceil((endTimestamp - Date.now()) / dayMs))
          })()

    const daysRemaining = Number.isFinite(computedDaysRemaining) ? computedDaysRemaining : 0

    return (
      <Pressable
        onPress={handlePress}
        android_ripple={{ color: "#e2e8f0" }}
        style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
        className="bg-white rounded-3xl shadow-md mb-6 overflow-hidden border border-gray-100"
      >
        <View className="relative">
          {dealImageUrl?.startsWith("http") ? (
            <Image
              source={{ uri: dealImageUrl }}
              style={{ width: "100%", height: 192 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              placeholder={IMAGE_PLACEHOLDER_BLURHASH}
              recyclingKey={`deal-${deal.id}`}
            />
          ) : (
            <View className="w-full h-48 bg-primary-600" />
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFill} />

          <View className="absolute top-4 right-4 bg-red-500 px-3 py-1.5 rounded-full shadow-lg flex-row items-center">
            <Tag size={14} color="white" strokeWidth={2.5} />
            <Text className="text-white font-bold text-xs ml-1.5">{discountPercent}% خصم</Text>
          </View>

          <View className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex-row items-center border border-white/20">
            <Clock size={12} color="white" />
            <Text className="text-white text-xs font-medium ml-1.5">ينتهي خلال {daysRemaining} أيام</Text>
          </View>
        </View>

        <View className="p-5">
          <Text className="text-xl font-bold text-text-main mb-2 text-right leading-tight">{deal.title}</Text>
          <Text className="text-text-secondary text-sm mb-4 leading-6 text-right" numberOfLines={2}>
            {deal.description}
          </Text>

          <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
            <View className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-full">
              <Text className="text-primary-700 font-bold text-xs">عرض التفاصيل</Text>
              <ArrowRight size={14} color="#2563EB" style={{ marginLeft: 6 }} />
            </View>
            <Text className="text-xs text-gray-400 font-medium">عرض خاص</Text>
          </View>
        </View>
      </Pressable>
    )
  },
  (prevProps, nextProps) => {
    const prevDiscount = Number(prevProps.deal.discountPercentage ?? prevProps.deal.discount_percentage ?? 0)
    const nextDiscount = Number(nextProps.deal.discountPercentage ?? nextProps.deal.discount_percentage ?? 0)
    const prevDays = Number(prevProps.deal.daysRemaining ?? prevProps.deal.days_remaining ?? 0)
    const nextDays = Number(nextProps.deal.daysRemaining ?? nextProps.deal.days_remaining ?? 0)

    return (
      prevProps.deal.id === nextProps.deal.id &&
      prevDiscount === nextDiscount &&
      prevDays === nextDays
    )
  },
)

export default DealCard
