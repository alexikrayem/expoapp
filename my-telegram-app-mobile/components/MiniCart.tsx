"use client"

import React, { useCallback } from "react"
import { View, ScrollView } from "react-native"
import { Image } from "expo-image"
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated"
import Text from "@/components/ThemedText"
import { useCart } from "@/context/CartContext"
import { useCurrency } from "@/context/CurrencyContext"
import { ArrowRight, ChevronUp, ChevronDown } from "lucide-react-native"
import { useRouter } from "expo-router"
import PressableScale from "@/components/ui/PressableScale"
import { IMAGE_PLACEHOLDER_BLURHASH } from "@/utils/image"

const CartItem = React.memo(({ item, formatPrice }: { item: any; formatPrice: (price: number) => string }) => (
  <View className="flex-row items-center p-3 border-b border-border last:border-0">
    <Image
      source={{ uri: item.image_url }}
      style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "#f3f4f6" }}
      contentFit="cover"
      cachePolicy="memory-disk"
      placeholder={IMAGE_PLACEHOLDER_BLURHASH}
      recyclingKey={`cart-${item.product_id}`}
    />
    <View className="flex-1 mx-3 items-end">
      <Text className="text-sm font-bold text-text-main text-right" numberOfLines={1}>
        {item.name}
      </Text>
      <Text className="text-xs text-text-secondary text-right">{formatPrice(item.effective_selling_price)}</Text>
    </View>
    <View className="bg-primary-50 px-2 py-1 rounded-md border border-primary-100">
      <Text className="text-primary-700 font-bold text-xs">x{item.quantity}</Text>
    </View>
  </View>
))

export default function MiniCart() {
  const { getCartTotal, getCartItemCount, cartItems } = useCart()
  const { formatPrice } = useCurrency()
  const router = useRouter()
  const itemCount = getCartItemCount()
  const total = getCartTotal()

  const [isExpanded, setIsExpanded] = React.useState(false)

  const expandProgress = useSharedValue(0)

  React.useEffect(() => {
    expandProgress.value = withSpring(isExpanded ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    })
  }, [isExpanded])

  const expandedListStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [{ translateY: (1 - expandProgress.value) * 20 }, { scale: 0.95 + expandProgress.value * 0.05 }],
  }))

  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), [])

  const handleNavigateToCart = useCallback(() => {
    router.push("/cart")
  }, [router])

  if (itemCount === 0) return null

  return (
    <View className="absolute bottom-20 left-4 right-4 z-50">
      {/* Expandable List */}
      {isExpanded && (
        <Animated.View
          style={[expandedListStyle, { maxHeight: 400, marginBottom: 10 }]}
          className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-border"
        >
          <View className="p-4 border-b border-border bg-gray-50/50 flex-row justify-between items-center">
            <Text className="font-bold text-text-main">محتويات السلة ({itemCount})</Text>
            <PressableScale
              onPress={toggleExpand}
              scaleTo={0.92}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronDown size={20} color="#64748b" />
            </PressableScale>
          </View>

          <ScrollView className="max-h-64" showsVerticalScrollIndicator={true}>
            {cartItems.map((item: any) => (
              <CartItem key={item.product_id} item={item} formatPrice={formatPrice} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Main Bar */}
      <PressableScale
        onPress={handleNavigateToCart}
        scaleTo={0.98}
        className="bg-blue-600 rounded-full p-4 shadow-xl flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <PressableScale
            onPress={toggleExpand}
            scaleTo={0.92}
            className="bg-white/20 p-2 rounded-lg mr-3 relative"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isExpanded ? <ChevronDown size={24} color="white" /> : <ChevronUp size={24} color="white" />}
            {!isExpanded && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border border-blue-600">
                <Text className="text-white text-xs font-bold">{itemCount}</Text>
              </View>
            )}
          </PressableScale>
          <View>
            <Text className="text-white text-xs font-medium opacity-90">المجموع</Text>
            <Text className="text-white text-lg font-bold">{formatPrice(total)}</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-lg">
          <Text className="text-white font-medium mr-2">إتمام الطلب</Text>
          <ArrowRight size={16} color="white" />
        </View>
      </PressableScale>
    </View>
  )
}
