"use client"

/// <reference types="nativewind/types" />
import { useState, useMemo, useCallback } from "react"
import { View, Pressable } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { Input } from "@/components/ui/Input"
import PressableScale from "@/components/ui/PressableScale"
import { useAuth } from "@/context/AuthContext"
import { useFavorites } from "@/hooks/useFavorites"
import { useFavoriteProducts } from "@/hooks/useFavoriteProducts"
import { useCart } from "@/context/CartContext"
import { useModal } from "@/context/ModalContext"
import ProductCard from "@/components/ProductCard" // This expects specific props
import { Search, X, Heart } from "lucide-react-native"
import { haptics } from "@/utils/haptics"
import AnimatedScreen from "@/components/ui/AnimatedScreen"

// -------------------------------
// Types
// -------------------------------
// UPDATED: This now matches the interface defined inside ProductCard.tsx
// plus the 'category' field needed for filtering in this screen.
type Product = {
  id: string 
  name: string
  price: number
  effective_selling_price: number
  image_url?: string // Fixed: ProductCard uses 'image_url', not 'image'
  supplier_name?: string
  category?: string
  is_on_sale?: boolean
  discount_price?: number
}

type Category = {
  id: string
  name: string
  count: number
}

export default function FavoritesScreen() {
  const { userProfile } = useAuth()
  const { favoriteIds, toggleFavorite, isLoadingFavorites } = useFavorites(userProfile)
  
  // useFavoriteProducts returns raw data (any[]), we will cast it later
  const { favoriteProducts, isLoadingFavoritesTab, favoritesTabError } =
    useFavoriteProducts(favoriteIds, true)

  const {
    actions: { addToCart },
  } = useCart()

  const { openModal } = useModal()

  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const isLoading = isLoadingFavorites || isLoadingFavoritesTab

  // -------------------------------
  // Data Normalization
  // -------------------------------
  // We process the raw API data to ensure it matches our Product Type strictly
  // This prevents the "string vs number" errors downstream.
  const normalizedProducts: Product[] = useMemo(() => {
    if (!favoriteProducts || !Array.isArray(favoriteProducts)) return []

    return favoriteProducts.map((p: any) => ({
      ...p,
      id: String(p.id), // Force ID to string to satisfy ProductCard and useFavorites
      price: Number(p.price || 0),
      effective_selling_price: Number(p.effective_selling_price || 0),
      // Ensure we map image correctly if API sends 'image' but Card needs 'image_url'
      image_url: p.image_url || p.image || null 
    }))
  }, [favoriteProducts])

  // -------------------------------
  // Categories List
  // -------------------------------
  const categories: Category[] = useMemo(() => {
    if (normalizedProducts.length === 0) return [{ id: "all", name: "الكل", count: 0 }]

    const map = new Map<string, number>()

    normalizedProducts.forEach((p) => {
      if (p.category) {
        map.set(p.category, (map.get(p.category) || 0) + 1)
      }
    })

    const items = Array.from(map.entries()).map(
      ([name, count]) => ({ id: name, name, count } as Category),
    )

    return [{ id: "all", name: "الكل", count: normalizedProducts.length }, ...items]
  }, [normalizedProducts])

  // -------------------------------
  // Filtered Products
  // -------------------------------
  const filteredProducts: Product[] = useMemo(() => {
    let items = [...normalizedProducts]

    if (activeCategory !== "all") {
      items = items.filter((p) => p.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.supplier_name?.toLowerCase().includes(q),
      )
    }

    return items
  }, [normalizedProducts, activeCategory, searchQuery])

  const handleShowDetails = (product: Product) => {
    openModal("productDetail", { product })
  }

  const keyExtractor = useCallback((item: Product) => item.id, [])

  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        // ProductCard expects `onAddToCart(product: Product)`
        onAddToCart={addToCart}
        // ProductCard expects `onToggleFavorite(id: string)`
        onToggleFavorite={toggleFavorite}
        onShowDetails={handleShowDetails}
        // favoriteIds is Set<string>, and item.id is string. Safe.
        isFavorite={favoriteIds.has(item.id)}
      />
    ),
    [addToCart, toggleFavorite, handleShowDetails, favoriteIds],
  )

  // -------------------------------
  // Error State
  // -------------------------------
  if (favoritesTabError) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-500">Error: {favoritesTabError}</Text>
      </SafeAreaView>
    )
  }

  // -------------------------------
  // Skeleton Loader
  // -------------------------------
  const renderSkeleton = () => (
    <View className="flex-1 p-3">
      <View className="flex-row flex-wrap justify-between">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            className="w-[48%] mb-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
          >
            <View className="h-40 bg-gray-200 animate-pulse" />
            <View className="p-3 space-y-2">
              <View className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <View className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              <View className="flex-row justify-between items-center mt-2">
                <View className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <View className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  // -------------------------------
  // MAIN UI
  // -------------------------------
  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        <View className="bg-white shadow-sm mb-1 border-b border-border z-10">
          <View className="px-5 pt-4 pb-3">
            <Text className="text-2xl font-bold text-text-main mb-3 text-right leading-tight">
              المفضلة
            </Text>

            {/* Search */}
            <Input
              fieldClassName="py-2.5"
              className="text-right font-medium"
              placeholder="ابحث في المفضلة..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<Search size={20} color="#64748b" />}
              rightIcon={
                searchQuery ? (
                  <PressableScale onPress={() => setSearchQuery("")} scaleTo={0.9} haptic="selection" className="bg-gray-200 p-1 rounded-full">
                    <X size={14} color="#64748b" />
                  </PressableScale>
                ) : null
              }
            />
          </View>

          {/* ------------------------------- */}
          {/* CATEGORY LIST */}
          {/* ------------------------------- */}
          {!isLoading && categories.length > 1 && (
            <FlashList<Category>
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 12,
              }}
              estimatedItemSize={72}
              removeClippedSubviews
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={4}
              keyExtractor={(item: Category) => item.id}
              renderItem={({ item }: { item: Category }) => (
                <Pressable
                  onPress={() => {
                    if (activeCategory !== item.id) {
                      haptics.selection()
                      setActiveCategory(item.id)
                    }
                  }}
                  android_ripple={{ color: "#e2e8f0" }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
                  className={`mr-2 px-4 py-2.5 rounded-full border ${
                    activeCategory === item.id
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      activeCategory === item.id
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {item.name}{" "}
                    <Text
                      className={`text-xs ${
                        activeCategory === item.id
                          ? "text-white/80"
                          : "text-gray-400"
                      }`}
                    >
                      ({item.count})
                    </Text>
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>

        {/* ------------------------------- */}
        {/* PRODUCT LIST */}
        {/* ------------------------------- */}
        {isLoading ? (
          renderSkeleton()
        ) : filteredProducts.length > 0 ? (
          <FlashList<Product>
            data={filteredProducts}
            estimatedItemSize={250}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            extraData={favoriteIds}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            renderItem={renderProductItem}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <View className="bg-red-50 p-8 rounded-full mb-6 shadow-sm">
              <Heart size={56} color="#ef4444" fill="#ef4444" />
            </View>

            <Text className="text-xl font-semibold text-text-main mb-2 leading-tight">
              {searchQuery || activeCategory !== "all"
                ? "لا توجد نتائج"
                : "قائمة المفضلة فارغة"}
            </Text>

            <Text className="text-text-secondary text-center leading-6 text-sm px-8">
              {searchQuery || activeCategory !== "all"
                ? "جرب تغيير فلاتر البحث أو التصنيف"
                : "أضف منتجات تعجبك بالضغط على أيقونة القلب لتجدها هنا!"}
            </Text>
          </View>
        )}
      </AnimatedScreen>
    </View>
  )
}
