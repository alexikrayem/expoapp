import { useState, useEffect, useRef, useCallback, type ComponentType } from "react"
import { View, ActivityIndicator, Modal, TextInput } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { Input } from "@/components/ui/Input"
import { useSearch, type SearchTab } from "@/context/SearchContext"
import { useAuth } from "@/context/AuthContext"
import { useDebounce } from "@/hooks/useDebounce"
import { useFavorites } from "@/hooks/useFavorites"
import { MIN_SEARCH_LENGTH, useSearchResults } from "@/hooks/useSearchResults"
import { searchService } from "@/services/searchService"
import { INTERACTION_DELAYS } from "@/utils/performanceConfig"
import { Search, X, Package, Tag, Factory, ArrowRight } from "lucide-react-native"
import ProductCard from "@/components/ProductCard"
import DealCard from "@/components/DealCard"
import SupplierCard from "@/components/SupplierCard"
import PressableScale from "@/components/ui/PressableScale"
import type { Product, Supplier } from "@/types"

interface SearchModalProps {
  visible: boolean
  onClose: () => void
  openModal: (type: string, props?: Record<string, unknown>) => void
}

interface SearchModalProduct extends Product {
  id: string
}

interface SearchModalDeal {
  id: string
  [key: string]: unknown
}

interface SearchModalSupplier extends Supplier {
  id: string
  [key: string]: unknown
}

type SearchTabIcon = ComponentType<{ size?: number; color?: string }>

const TABS: { id: SearchTab; label: string; icon: SearchTabIcon }[] = [
  { id: "products", label: "المنتجات", icon: Package },
  { id: "deals", label: "العروض", icon: Tag },
  { id: "suppliers", label: "الموردون", icon: Factory },
]

const SEARCH_DEBOUNCE_DELAY_MS = INTERACTION_DELAYS.search

const normalizeTerm = (value: string) => value.trim().replace(/\s+/g, " ")

export default function SearchModal({ visible, onClose, openModal }: SearchModalProps) {
  const { searchTerm, activeSearchTab, setActiveSearchTab, handleSearchTermChange, clearSearch } = useSearch()
  const { userProfile } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [lastQueryTerm, setLastQueryTerm] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isRecentSearchesLoading, setIsRecentSearchesLoading] = useState(false)
  const [isClearingRecentSearches, setIsClearingRecentSearches] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY_MS)
  const cityId = String(userProfile?.selected_city_id || "1")
  const { searchResults, resultCounts, hasAnyResults, isSearching, searchError, hasSearchQuery } = useSearchResults(
    debouncedSearchTerm,
    cityId,
  )
  const normalizedSearchTerm = normalizeTerm(searchTerm)
  const normalizedDebouncedTerm = normalizeTerm(debouncedSearchTerm)
  const hasTypedQuery = normalizedSearchTerm.length >= MIN_SEARCH_LENGTH
  const isDebouncing = hasTypedQuery && normalizedSearchTerm !== normalizedDebouncedTerm
  const showSearchLoading = isSearching || isDebouncing

  const loadRecentSearches = useCallback(async () => {
    setIsRecentSearchesLoading(true)
    try {
      const recent = await searchService.getRecentSearches()
      setRecentSearches(recent)
    } catch (error) {
      console.error("Failed to load recent searches", error)
    } finally {
      setIsRecentSearchesLoading(false)
    }
  }, [])

  const rememberSearchTerm = useCallback(async (term: string) => {
    const normalizedTerm = normalizeTerm(term)
    if (normalizedTerm.length < MIN_SEARCH_LENGTH) return
    try {
      const nextRecentSearches = await searchService.saveRecentSearch(normalizedTerm)
      setRecentSearches(nextRecentSearches)
    } catch (error) {
      console.error("Failed to save recent search", error)
    }
  }, [])

  const handleRemoveRecentSearch = useCallback(async (term: string) => {
    try {
      const nextRecentSearches = await searchService.removeRecentSearch(term)
      setRecentSearches(nextRecentSearches)
    } catch (error) {
      console.error("Failed to remove recent search", error)
    }
  }, [])

  const handleClearRecentSearches = useCallback(async () => {
    setIsClearingRecentSearches(true)
    try {
      await searchService.clearRecentSearches()
      setRecentSearches([])
    } catch (error) {
      console.error("Failed to clear recent searches", error)
    } finally {
      setIsClearingRecentSearches(false)
    }
  }, [])

  const handleSearchSubmit = useCallback(() => {
    void rememberSearchTerm(searchTerm)
  }, [rememberSearchTerm, searchTerm])

  const handleSelectRecentSearch = useCallback(
    (term: string) => {
      handleSearchTermChange(term)
      void rememberSearchTerm(term)
      inputRef.current?.focus()
    },
    [handleSearchTermChange, rememberSearchTerm],
  )

  useEffect(() => {
    if (visible) {
      void loadRecentSearches()
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(focusTimer)
    }
  }, [visible, loadRecentSearches])

  useEffect(() => {
    if (!hasTypedQuery || showSearchLoading) {
      return
    }

    if (resultCounts[activeSearchTab] > 0) {
      return
    }

    if (resultCounts.products > 0) setActiveSearchTab("products")
    else if (resultCounts.deals > 0) setActiveSearchTab("deals")
    else if (resultCounts.suppliers > 0) setActiveSearchTab("suppliers")
    else setActiveSearchTab("products")
  }, [resultCounts, showSearchLoading, hasTypedQuery, activeSearchTab, setActiveSearchTab])

  useEffect(() => {
    if (hasSearchQuery && !showSearchLoading) {
      setLastQueryTerm(normalizedDebouncedTerm)
      void rememberSearchTerm(normalizedDebouncedTerm)
    }
  }, [hasSearchQuery, showSearchLoading, normalizedDebouncedTerm, rememberSearchTerm])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleShowProductDetails = useCallback(
    (product: SearchModalProduct) => {
      void rememberSearchTerm(searchTerm)
      handleClose()
      setTimeout(() => {
        openModal("productDetail", { product })
      }, 150)
    },
    [handleClose, openModal, rememberSearchTerm, searchTerm],
  )

  const renderProductItem = useCallback(
    ({ item }: { item: SearchModalProduct }) => (
      <ProductCard
        product={item}
        onAddToCart={() => {}}
        onToggleFavorite={toggleFavorite}
        onShowDetails={handleShowProductDetails}
        isFavorite={favoriteIds.has(String(item.id))}
      />
    ),
    [favoriteIds, handleShowProductDetails, toggleFavorite],
  )

  const renderDealItem = useCallback(
    ({ item }: { item: SearchModalDeal }) => (
      <View className="px-4">
        <DealCard
          deal={item}
          onShowDetails={(dealId: string) => {
            void rememberSearchTerm(searchTerm)
            handleClose()
            setTimeout(() => {
              openModal("dealDetail", { dealId })
            }, 150)
          }}
        />
      </View>
    ),
    [openModal, handleClose, rememberSearchTerm, searchTerm],
  )

  const renderSupplierItem = useCallback(
    ({ item }: { item: SearchModalSupplier }) => (
      <View className="px-4">
        <SupplierCard
          supplier={item}
          onShowDetails={(supplierId: string) => {
            void rememberSearchTerm(searchTerm)
            handleClose()
            setTimeout(() => {
              openModal("supplierDetail", { supplierId })
            }, 150)
          }}
        />
      </View>
    ),
    [openModal, handleClose, rememberSearchTerm, searchTerm],
  )

  const renderRecentSearches = () => {
    if (isRecentSearchesLoading) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#2563EB" />
          <Text className="mt-3 text-gray-500">جاري تحميل آخر عمليات البحث...</Text>
        </View>
      )
    }

    if (recentSearches.length === 0) {
      return (
        <View className="flex-1 justify-center items-center opacity-50">
          <Search size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-500">ابحث عن منتجات، عروض، أو موردين</Text>
        </View>
      )
    }

    return (
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-text-main">عمليات البحث الأخيرة</Text>
          <PressableScale
            onPress={handleClearRecentSearches}
            disabled={isClearingRecentSearches}
            scaleTo={0.95}
            haptic="selection"
            className="px-3 py-1.5 rounded-lg border border-border bg-surface"
          >
            {isClearingRecentSearches ? (
              <ActivityIndicator size="small" color="#64748b" />
            ) : (
              <Text className="text-xs text-text-secondary">مسح الكل</Text>
            )}
          </PressableScale>
        </View>

        {recentSearches.map((term) => (
          <View key={term} className="flex-row items-center mb-2">
            <PressableScale
              onPress={() => handleSelectRecentSearch(term)}
              scaleTo={0.98}
              haptic="selection"
              className="flex-1 flex-row items-center bg-white border border-border rounded-xl px-3 py-3"
            >
              <Search size={16} color="#94a3b8" />
              <Text className="ml-2 text-text-main">{term}</Text>
            </PressableScale>

            <PressableScale
              onPress={() => handleRemoveRecentSearch(term)}
              scaleTo={0.92}
              haptic="selection"
              className="ml-2 p-2 rounded-lg bg-surface border border-border"
            >
              <X size={14} color="#94a3b8" />
            </PressableScale>
          </View>
        ))}
      </View>
    )
  }

  const renderContent = () => {
    if (!hasTypedQuery) {
      return renderRecentSearches()
    }

    if (showSearchLoading && !hasAnyResults) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-500">جاري البحث...</Text>
        </View>
      )
    }

    if (searchError && !hasAnyResults) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-center">{searchError}</Text>
        </View>
      )
    }

    if (!hasAnyResults && !showSearchLoading) {
      return (
        <View className="flex-1 justify-center items-center opacity-50">
          <Search size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-500">لا توجد نتائج لـ "{lastQueryTerm || normalizedSearchTerm}"</Text>
        </View>
      )
    }

    if (activeSearchTab === "products") {
      return (
        <FlashList<SearchModalProduct>
          data={(searchResults.products?.items || []) as SearchModalProduct[]}
          keyExtractor={(item: SearchModalProduct) => `prod-${item.id}`}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا توجد منتجات مطابقة</Text>}
          estimatedItemSize={250}
          extraData={favoriteIds}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )
    }

    if (activeSearchTab === "deals") {
      return (
        <FlashList<SearchModalDeal>
          data={searchResults.deals as SearchModalDeal[]}
          keyExtractor={(item: SearchModalDeal) => `deal-${item.id}`}
          renderItem={renderDealItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا توجد عروض مطابقة</Text>}
          estimatedItemSize={300}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={4}
        />
      )
    }

    if (activeSearchTab === "suppliers") {
      return (
        <FlashList<SearchModalSupplier>
          data={searchResults.suppliers as SearchModalSupplier[]}
          keyExtractor={(item: SearchModalSupplier) => `supp-${item.id}`}
          renderItem={renderSupplierItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا يوجد موردون مطابقون</Text>}
          estimatedItemSize={100}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )
    }
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <SafeAreaView className="flex-1 bg-surface">
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-border flex-row items-center">
          <PressableScale
            onPress={handleClose}
            scaleTo={0.92}
            haptic="selection"
            className="p-2 bg-surface rounded-full border border-border"
          >
            <ArrowRight size={20} color="#64748b" />
          </PressableScale>
          <Input
            ref={inputRef}
            containerClassName="flex-1 mx-3"
            fieldClassName="py-2.5"
            className="text-right font-medium"
            placeholder="بحث..."
            value={searchTerm}
            onChangeText={handleSearchTermChange}
            onSubmitEditing={handleSearchSubmit}
            textAlign="right"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Search size={20} color="#64748b" />}
            rightIcon={
              searchTerm.length > 0 ? (
                <PressableScale
                  onPress={() => {
                    clearSearch()
                    inputRef.current?.focus()
                  }}
                  scaleTo={0.9}
                  haptic="selection"
                  className="bg-gray-200 p-1 rounded-full"
                >
                  <X size={14} color="#64748b" />
                </PressableScale>
              ) : null
            }
          />
        </View>

        {/* Tabs */}
        {hasTypedQuery ? (
          <View className="flex-row justify-between px-4 py-3 bg-white border-b border-border z-10">
            {TABS.map((tab) => {
              const isActive = activeSearchTab === tab.id
              const Icon = tab.icon
              const count = resultCounts[tab.id]

              if (count === 0 && !showSearchLoading) return null

              return (
                <PressableScale
                  key={tab.id}
                  onPress={() => setActiveSearchTab(tab.id)}
                  scaleTo={0.98}
                  haptic="selection"
                  className={`flex-1 flex-row items-center justify-center py-2.5 mx-1 rounded-xl border ${
                    isActive ? "bg-primary-50 border-primary-200" : "bg-white border-transparent"
                  }`}
                >
                  <Icon size={16} color={isActive ? "#2563eb" : "#64748b"} />
                  <Text className={`ml-2 text-sm font-semibold ${isActive ? "text-primary-600" : "text-text-secondary"}`}>
                    {tab.label} ({count})
                  </Text>
                </PressableScale>
              )
            })}
          </View>
        ) : null}

        {hasTypedQuery && showSearchLoading && hasAnyResults ? (
          <View className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex-row items-center">
            <ActivityIndicator size="small" color="#2563EB" />
            <Text className="ml-2 text-xs text-blue-700">يتم تحديث النتائج...</Text>
          </View>
        ) : null}

        {hasTypedQuery && searchError && hasAnyResults ? (
          <View className="px-4 py-2 bg-red-50 border-b border-red-100">
            <Text className="text-xs text-red-600">{searchError}</Text>
          </View>
        ) : null}

        {/* Content */}
        <View className="flex-1">{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  )
}
