"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { View, TouchableOpacity, Dimensions, StyleSheet } from "react-native"
import Animated from "react-native-reanimated"
import { Image } from "expo-image"
import Text from "@/components/ThemedText"
import { LinearGradient } from "expo-linear-gradient"
import { Sparkles } from "lucide-react-native"

const { width } = Dimensions.get("window")
const SLIDER_HEIGHT = 200
const CARD_WIDTH = width - 32
const CARD_SPACING = 16
const AUTO_PLAY_INTERVAL = 4000

interface FeaturedSliderProps {
  items: any[]
  onSlideClick: (item: any) => void
  isLoading?: boolean
}

const SlideItem = React.memo(
  ({
    item,
    index,
    totalItems,
    onPress,
  }: {
    item: any
    index: number
    totalItems: number
    onPress: () => void
  }) => (
    <View style={{ width: CARD_WIDTH, marginRight: index === totalItems - 1 ? 0 : CARD_SPACING }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.card}>
        {(item.imageUrl || item.image_url)?.startsWith("http") ? (
          <Image
            source={{ uri: item.imageUrl || item.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={`featured-${item.id}`}
          />
        ) : (
          <LinearGradient
            colors={["#4f46e5", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
          locations={[0, 0.4, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View className="absolute top-4 left-4 flex-row items-center bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
          <Sparkles size={14} color="white" fill="white" />
          <Text className="text-white text-xs font-bold ml-1.5">مميز</Text>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-5">
          <Text className="text-white font-bold text-xl mb-1.5 drop-shadow-lg" numberOfLines={2} style={styles.title}>
            {item.name || item.title}
          </Text>
          <Text
            className="text-white/90 text-sm leading-5 drop-shadow-md font-medium"
            numberOfLines={2}
            style={styles.description}
          >
            {item.description || item.subtitle || ""}
          </Text>
        </View>

        <View style={styles.shine} />
      </TouchableOpacity>
    </View>
  ),
)

const IndicatorDot = React.memo(({ isActive }: { isActive: boolean }) => (
  <View className={`h-2 rounded-full ${isActive ? "w-8 bg-primary-600" : "w-2 bg-gray-300"}`} />
))

const FeaturedSlider = React.memo(({ items, onSlideClick, isLoading }: FeaturedSliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const flatListRef = useRef<Animated.FlatList<any>>(null)
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-play functionality
  useEffect(() => {
    if (!items || items.length === 0) return

    const startAutoPlay = () => {
      autoPlayTimerRef.current = setInterval(() => {
        setActiveIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % items.length
          flatListRef.current?.scrollToOffset({
            offset: nextIndex * (CARD_WIDTH + CARD_SPACING),
            animated: true,
          })
          return nextIndex
        })
      }, AUTO_PLAY_INTERVAL)
    }

    startAutoPlay()

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }
  }, [items]) // Updated to use items directly

  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffsetX / (CARD_WIDTH + CARD_SPACING))
    setActiveIndex(index)

    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current)
    }
  }, [])

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <SlideItem item={item} index={index} totalItems={items.length} onPress={() => onSlideClick(item)} />
    ),
    [items, onSlideClick],
  )

  const keyExtractor = useCallback((item: any, index: number) => `featured-${item.id || index}`, [])

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: CARD_WIDTH + CARD_SPACING,
      offset: (CARD_WIDTH + CARD_SPACING) * index,
      index,
    }),
    [],
  )

  if (isLoading || !items || items.length === 0) {
    return null
  }

  return (
    <View className="mt-4 mb-6">
      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={1}
      />

      <View className="flex-row justify-center mt-4 gap-2">
        {items.map((_, index) => (
          <IndicatorDot key={index} isActive={index === activeIndex} />
        ))}
      </View>
    </View>
  )
})

export default FeaturedSlider

const styles = StyleSheet.create({
  card: {
    height: SLIDER_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1e293b",
  },
  title: {
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: -100,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ skewX: "-20deg" }],
  },
})
