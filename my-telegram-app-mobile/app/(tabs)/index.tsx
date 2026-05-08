import React, { useState, useCallback, useMemo } from "react"
import { View, ActivityIndicator, RefreshControl, ScrollView } from "react-native"
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
import { useFavorites } from "@/hooks/useFavorites"
import { Package, Tag, Factory } from "lucide-react-native"
import { useCart } from "@/context/CartContext"
import AnimatedScreen from "@/components/ui/AnimatedScreen"
import Header from "@/components/Header"
import PressableScale from "@/components/ui/PressableScale"
import type { Product, Deal, Supplier, FeaturedItem } from "@/types"

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
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        haptic="selection"
        className={`flex-row items-center justify-center py-2 px-3.5 mx-1 rounded-full ${isActive ? "bg-primary-500" : "bg-gray-100"
          }`}
        style={{ minWidth: 100 }}
      >
        <Icon size={16} color={isActive ? "#ffffff" : "#64748b"} />
        <Text
          numberOfLines={1}
          className={`ml-2 text-xs font-semibold ${isActive ? "text-white" : "text-text-secondary"}`}
        >
          {tab.label}
        </Text>
      </PressableScale>
    )
  },
)
TabButton.displayName = "TabButton"

export default function HomeScreen() {
  const [activeSection, setActiveSection] = useState<string>("products")
  const [selectedCityId] = useState<string>("1")
  const [filters, setFilters] = useState<Record<string, string | number | boolean | undefined>>({ category: "all" })

  const {
    products,
    loadMoreProducts,
    isLoadingMore,
    refreshProducts,
    isRefetchingProducts,
  } = useProducts(selectedCityId, filters)

  const { deals, isLoadingDeals, refreshDeals, isRefetchingDeals } = useDeals(selectedCityId)

  const { suppliers, isLoadingSuppliers, refreshSuppliers, isRefetchingSuppliers } = useSuppliers(selectedCityId)

  const { featuredItems, isLoadingFeatured, refreshFeatured } = useFeaturedItems()

  const { openModal } = useModal()
  const {
    actions: { addToCart },
  } = useCart()

  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites()

  // Handlers
  const handleShowProductDetails = useCallback(
    (product: Product) => {
      openModal("productDetail", { product })
    },
    [openModal],
  )

  const handleShowDealDetails = useCallback(
    (dealId: string) => {
      openModal("dealDetail", { dealId })
    },
    [openModal],
  )

  const handleShowSupplierDetails = useCallback(
    (supplierId: string) => {
      openModal("supplierDetail", { supplierId })
    },
    [openModal],
  )

  const handleAddToCart = useCallback(
    (product: Product) => {
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
    ({ item }: { item: Product }) => (
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
    ({ item }: { item: Deal }) => (
      <View className="px-4">
        <DealCard deal={item} onShowDetails={handleShowDealDetails} />
      </View>
    ),
    [handleShowDealDetails],
  )

  const renderSupplierItem = useCallback(
    ({ item }: { item: Supplier }) => (
      <View className="px-4">
        <SupplierCard supplier={item} onShowDetails={handleShowSupplierDetails} />
      </View>
    ),
    [handleShowSupplierDetails],
  )

  const productKeyExtractor = useCallback((item: Product) => `prod-${item.id}`, [])
  const dealKeyExtractor = useCallback((item: Deal) => `deal-${item.id}`, [])
  const supplierKeyExtractor = useCallback((item: Supplier) => `supp-${item.id}`, [])

  const handleSlideClick = useCallback(
    (item: FeaturedItem) => {
      const itemType = item.type
      if (itemType === "product") {
        handleShowProductDetails(item as unknown as Product)
      } else if (itemType === "deal") {
        openModal("dealDetail", { dealId: item.id })
      } else if (itemType === "supplier") {
        openModal("supplierDetail", { supplierId: item.id })
      } else if (itemType === "list") {
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
          <ProductFilterBar currentFilters={filters} onFiltersChange={setFilters as unknown as (f: unknown) => void} selectedCityId={selectedCityId} />
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
        <FlashList<Product>
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
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )
    }

    if (activeSection === "exhibitions") {
      return (
        <FlashList<Deal>
          data={deals}
          renderItem={renderDealItem}
          keyExtractor={dealKeyExtractor}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={ListHeader}
          refreshControl={dealsRefreshControl}
          ListEmptyComponent={DealsEmptyComponent}
          estimatedItemSize={300}
          drawDistance={500}
          removeClippedSubviews
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={4}
        />
      )
    }

    if (activeSection === "suppliers") {
      return (
        <FlashList<Supplier>
          data={suppliers}
          renderItem={renderSupplierItem}
          keyExtractor={supplierKeyExtractor}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={ListHeader}
          refreshControl={suppliersRefreshControl}
          ListEmptyComponent={SuppliersEmptyComponent}
          estimatedItemSize={100}
          drawDistance={500}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        <View className="bg-white z-10 shadow-sm pb-2">
          <Header />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
          >
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeSection === tab.id}
                onPress={() => handleTabPress(tab.id)}
              />
            ))}
          </ScrollView>
        </View>

        {renderContent()}
      </AnimatedScreen>
    </View>
  )
}
