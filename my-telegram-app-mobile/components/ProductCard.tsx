"use client"

/// <reference types="nativewind/types" />
import React, { useState } from "react"
import { View, Pressable, Dimensions } from "react-native"
import { Image } from "expo-image"
import Text from "@/components/ThemedText"
import { ShoppingCart, Heart } from "lucide-react-native"
import { useCurrency } from "../context/CurrencyContext"
import { Skeleton } from "./ui/Skeleton"
import { haptics } from "@/utils/haptics"
import { Product } from "@/types"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const CARD_MARGIN = 6
// Calculation used by parent FlashLists usually, but kept here if stand-alone usage

const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN * 2) / 2

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  onToggleFavorite: (id: string) => void
  onShowDetails: (product: Product) => void
  isFavorite: boolean
}

const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({ product, onAddToCart, onToggleFavorite, onShowDetails, isFavorite }) => {
    const { formatPrice } = useCurrency()
    const [isImageLoading, setIsImageLoading] = useState(true)

    // The Image component's onLoadStart already handles this

    const handleAddToCart = React.useCallback(() => {
      haptics.medium()
      onAddToCart(product)
    }, [onAddToCart, product])

    const handleToggleFavorite = React.useCallback(() => {
      haptics.light()
      onToggleFavorite(product.id)
    }, [onToggleFavorite, product.id])

    const handleShowDetails = React.useCallback(() => {
      onShowDetails(product)
    }, [onShowDetails, product])

    return (
      <View className="flex-1 m-1.5">
        <Pressable
          onPress={handleShowDetails}
          className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden active:opacity-90 active:scale-[0.98]"
        >
          <View className="h-[150px] w-full bg-slate-50 relative overflow-hidden">
            {product.image_url && !product.image_url.startsWith("linear-gradient") ? (
              <>
                <Image
                  source={{ uri: product.image_url }}
                  className="w-full h-full"
                  contentFit="cover"
                  transition={200}
                  recyclingKey={product.id}
                  cachePolicy="memory-disk"
                  onLoadStart={() => setIsImageLoading(true)}
                  onLoad={() => setIsImageLoading(false)}
                />
                {isImageLoading && (
                  <View className="absolute inset-0">
                    <Skeleton width="100%" height="100%" />
                  </View>
                )}
              </>
            ) : (
              <View className="w-full h-full items-center justify-center bg-slate-100">
                <Text className="text-xs text-text-secondary">No Image</Text>
              </View>
            )}

            {product.is_on_sale && (
              <View className="absolute top-2 left-2 bg-red-500 px-2.5 py-1 rounded-xl z-10">
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Sale</Text>
              </View>
            )}

            <Pressable
              onPress={handleToggleFavorite}
              className="absolute top-2 right-2 p-2 bg-white/90 rounded-full z-10 shadow-sm active:bg-white"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Heart
                size={18}
                color={isFavorite ? "#ef4444" : "#64748b"}
                fill={isFavorite ? "#ef4444" : "transparent"}
              />
            </Pressable>
          </View>

          <View className="p-3">
            <Text className="font-semibold text-sm mb-1 text-text-main leading-tight text-right w-full" numberOfLines={2}>
              {product.name}
            </Text>

            <Text className="text-xs text-text-secondary mb-3 text-right w-full" numberOfLines={1}>
              {product.supplier_name}
            </Text>

            <View className="flex-row items-end justify-between">
              <Pressable
                onPress={handleAddToCart}
                className="p-2.5 bg-blue-50 rounded-xl active:bg-blue-100"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ShoppingCart size={18} color="#2563eb" />
              </Pressable>

              <View className="items-end">
                {product.is_on_sale && product.discount_price && (
                  <Text className="text-xs line-through text-text-secondary mb-0.5">
                    {formatPrice(product.price)}
                  </Text>
                )}
                <Text className="text-primary-600 font-bold text-base">
                  {formatPrice(product.effective_selling_price)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.effective_selling_price === nextProps.product.effective_selling_price &&
      prevProps.product.is_on_sale === nextProps.product.is_on_sale &&
      prevProps.isFavorite === nextProps.isFavorite
    )
  },
)

export default ProductCard
