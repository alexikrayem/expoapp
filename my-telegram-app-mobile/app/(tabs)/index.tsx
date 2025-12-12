"use client"

import React, { useState, useCallback, useMemo } from "react"
import { View, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native"
import { FlashList } from "@shopify/flash-list"
import Text from "@/components/ThemedText"
import { useProducts } from "@/hooks/useProducts"
import { useDeals } from "@/hooks/useDeals"
import { useSuppliers } from "@/hooks/useSuppliers"
import { useFeaturedItems } from "@/hooks/useFeaturedItems"
import ProductCard from "@/components/ProductCard"
import DealCard from "@/components/DealCard"
import SupplierCard from "@/components/SupplierCard"
import FeaturedSlider from "@/components/FeaturedSlider"
import ProductFilterBar from "@/components/ProductFilterBar"
import { useModal } from "@/context/ModalContext"
import { useAuth } from "@/context/AuthContext"
import { useFavorites } from "@/hooks/useFavorites"
import { Package, Tag, Factory } from "lucide-react-native"
import { useCart } from "@/context/CartContext"
import AnimatedScreen from "@/components/ui/AnimatedScreen"
import Header from "@/components/Header"

type FlashListLayout = {
  span?: number
}

const TABS = [
  { id: "products", label: "المنتجات", icon: Package },
  { id: "exhibitions", label: "العروض", icon: Tag },
  { id: "suppliers", label: "الموردون", icon: Factory },
] as const

const TabButton = React.memo(
  ({
    tab,
    isActive,
    onPress,
  }: {
    tab: (typeof TABS)[number]
    isActive: boolean
    onPress: () => void
  }) => {
    const Icon = tab.icon
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`flex-1 flex-row items-center justify-center py-2.5 mx-1 rounded-full ${
          isActive ? "bg-primary-500" : "bg-gray-100"
        }`}
      >
        <Icon size={18} color={isActive ? "#ffffff" : "#64748b"} />
        <Text className={`ml-2 text-sm font-bold ${isActive ? "text-white" : "text-text-secondary"}`}>{tab.label}</Text>
      </TouchableOpacity>
    )
  },
)

export default function HomeScreen() {
  const [activeSection, setActiveSection] = useState<string>("products")
  const [selectedCityId, setSelectedCityId] = useState<string>("1")
  const [filters, setFilters] = useState({ category: "all" })

  const {
    products,
    isLoadingProducts,
    loadMoreProducts,
    hasMorePages,
    isLoadingMore,
    refreshProducts,
    isRefetchingProducts,
  } = useProducts(selectedCityId, filters)

  const { deals, isLoadingDeals, refreshDeals, isRefetchingDeals } = useDeals(selectedCityId)

  const { suppliers, isLoadingSuppliers, refreshSuppliers, isRefetchingSuppliers } = useSuppliers(selectedCityId)

  const { featuredItems, isLoadingFeatured, refreshFeatured, isRefetchingFeatured } = useFeaturedItems()

  const { openModal } = useModal()
  const { userProfile } = useAuth()
  const {
    actions: { addToCart },
  } = useCart()

  const telegramUser = userProfile || { id: 12345 }
  const { isFavorite, toggleFavorite, favoriteIds, isLoadingFavorites } = useFavorites(telegramUser)

  // Handlers
  const handleShowProductDetails = useCallback(
    (product: any) => {
      openModal("productDetail", { product })
    },
    [openModal],
  )

  const handleShowDealDetails = useCallback((dealId: string) => {
    console.log("Show deal details:", dealId)
  }, [])

  const handleShowSupplierDetails = useCallback((supplierId: string) => {
    console.log("Show supplier details:", supplierId)
  }, [])

  const handleAddToCart = useCallback(
    (product: any) => {
      addToCart(product)
    },
    [addToCart],
  )

  const handleToggleFavorite = useCallback(
    (id: string) => {
      toggleFavorite(id)
    },
    [toggleFavorite],
  )

  const onRefresh = useCallback(() => {
    if (activeSection === "products") refreshProducts()
    else if (activeSection === "exhibitions") refreshDeals()
    else if (activeSection === "suppliers") refreshSuppliers()
    refreshFeatured()
  }, [activeSection, refreshProducts, refreshDeals, refreshSuppliers, refreshFeatured])

  const checkIsFavorite = useCallback((id: string) => isFavorite(id), [isFavorite])

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductCard
        product={item}
        onAddToCart={handleAddToCart}
        onToggleFavorite={handleToggleFavorite}
        onShowDetails={handleShowProductDetails}
        isFavorite={checkIsFavorite(item.id)}
      />
    ),
    [handleAddToCart, handleToggleFavorite, handleShowProductDetails, checkIsFavorite],
  )

  const renderDealItem = useCallback(
    ({ item }: { item: any }) => (
      <View className="px-4">
        <DealCard deal={item} onShowDetails={handleShowDealDetails} />
      </View>
    ),
    [handleShowDealDetails],
  )

  const renderSupplierItem = useCallback(
    ({ item }: { item: any }) => (
      <View className="px-4">
        <SupplierCard supplier={item} onShowDetails={handleShowSupplierDetails} />
      </View>
    ),
    [handleShowSupplierDetails],
  )

  const productKeyExtractor = useCallback((item: any) => `prod-${item.id}`, [])
  const dealKeyExtractor = useCallback((item: any) => `deal-${item.id}`, [])
  const supplierKeyExtractor = useCallback((item: any) => `supp-${item.id}`, [])

  const handleSlideClick = useCallback(
    (item: any) => {
      if (item.type === "product") {
        handleShowProductDetails(item)
      } else if (item.type === "deal") {
        openModal("dealDetail", { dealId: item.id })
      } else if (item.type === "supplier") {
        openModal("supplierDetail", { supplierId: item.id })
      } else if (item.type === "list") {
        openModal("featuredList", { list: item })
      }
    },
    [handleShowProductDetails, openModal],
  )

  const ListHeader = useMemo(
    () => (
      <View>
        <FeaturedSlider items={featuredItems} onSlideClick={handleSlideClick} isLoading={isLoadingFeatured} />
        {activeSection === "products" && (
          <ProductFilterBar currentFilters={filters} onFiltersChange={setFilters} selectedCityId={selectedCityId} />
        )}
      </View>
    ),
    [featuredItems, handleSlideClick, isLoadingFeatured, activeSection, filters, selectedCityId],
  )

  const ListFooter = useMemo(
    () => (isLoadingMore ? <ActivityIndicator size="small" className="py-4" /> : null),
    [isLoadingMore],
  )

  const DealsEmptyComponent = useMemo(
    () => (!isLoadingDeals ? <Text className="text-center text-gray-500 mt-10">لا توجد عروض متاحة حالياً</Text> : null),
    [isLoadingDeals],
  )

  const SuppliersEmptyComponent = useMemo(
    () =>
      !isLoadingSuppliers ? <Text className="text-center text-gray-500 mt-10">لا يوجد موردون متاحون حالياً</Text> : null,
    [isLoadingSuppliers],
  )

  const productsRefreshControl = useMemo(
    () => <RefreshControl refreshing={isRefetchingProducts} onRefresh={onRefresh} />,
    [isRefetchingProducts, onRefresh],
  )

  const dealsRefreshControl = useMemo(
    () => <RefreshControl refreshing={isRefetchingDeals} onRefresh={onRefresh} />,
    [isRefetchingDeals, onRefresh],
  )

  const suppliersRefreshControl = useMemo(
    () => <RefreshControl refreshing={isRefetchingSuppliers} onRefresh={onRefresh} />,
    [isRefetchingSuppliers, onRefresh],
  )

  const handleTabPress = useCallback((tabId: string) => {
    setActiveSection(tabId)
  }, [])

  const renderContent = () => {
    if (activeSection === "products") {
      return (
        <FlashList<any>
          data={products}
          renderItem={renderProductItem}
          keyExtractor={productKeyExtractor}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          ListHeaderComponent={ListHeader}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooter}
          refreshControl={productsRefreshControl}
          estimatedItemSize={250}
          extraData={favoriteIds}
          drawDistance={500}
        />
      )
    }

    if (activeSection === "exhibitions") {
      return (
        <FlashList<any>
          data={deals}
          renderItem={renderDealItem}
          keyExtractor={dealKeyExtractor}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={ListHeader}
          refreshControl={dealsRefreshControl}
          ListEmptyComponent={DealsEmptyComponent}
          estimatedItemSize={300}
          drawDistance={500}
        />
      )
    }

    if (activeSection === "suppliers") {
      return (
        <FlashList<any>
          data={suppliers}
          renderItem={renderSupplierItem}
          keyExtractor={supplierKeyExtractor}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={ListHeader}
          refreshControl={suppliersRefreshControl}
          ListEmptyComponent={SuppliersEmptyComponent}
          estimatedItemSize={100}
          drawDistance={500}
        />
      )
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        <View className="bg-white z-10 shadow-sm pb-2">
          <Header />
          <View className="flex-row justify-between px-4 py-2">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeSection === tab.id}
                onPress={() => handleTabPress(tab.id)}
              />
            ))}
          </View>
        </View>

        {renderContent()}
      </AnimatedScreen>
    </View>
  )
}
