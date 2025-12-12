"use client"

import { useState, useEffect, useRef } from "react"
import { View, TextInput, TouchableOpacity, ActivityIndicator, Modal } from "react-native"
import { FlashList } from "@shopify/flash-list"
import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useSearch } from "@/context/SearchContext"
import { useAuth } from "@/context/AuthContext"
import { useFavorites } from "@/hooks/useFavorites"
import { Search, X, Package, Tag, Factory, ArrowRight } from "lucide-react-native"
import ProductCard from "@/components/ProductCard"
import DealCard from "@/components/DealCard"
import SupplierCard from "@/components/SupplierCard"

interface SearchModalProps {
  visible: boolean
  onClose: () => void
  openModal: (type: string, props?: any) => void
}

const TABS = [
  { id: "products", label: "المنتجات", icon: Package },
  { id: "deals", label: "العروض", icon: Tag },
  { id: "suppliers", label: "الموردون", icon: Factory },
]

export default function SearchModal({ visible, onClose, openModal }: SearchModalProps) {
  const { searchTerm, isSearching, searchResults, searchError, handleSearchTermChange, clearSearch } = useSearch()
  const { userProfile } = useAuth()
  const { favoriteIds, toggleFavorite } = useFavorites(userProfile)
  const [activeTab, setActiveTab] = useState("products")
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  useEffect(() => {
    if (!isSearching && searchTerm.length >= 2) {
      if (searchResults.products?.totalItems > 0) setActiveTab("products")
      else if (searchResults.deals?.length > 0) setActiveTab("deals")
      else if (searchResults.suppliers?.length > 0) setActiveTab("suppliers")
    }
  }, [searchResults, isSearching, searchTerm])

  const handleClose = () => {
    clearSearch()
    onClose()
  }

  const handleShowProductDetails = (product: any) => {
    openModal("productDetail", { product })
  }

  const renderProductItem = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onAddToCart={() => {}}
      onToggleFavorite={toggleFavorite}
      onShowDetails={handleShowProductDetails}
      isFavorite={favoriteIds.has(item.id)}
    />
  )

  const renderDealItem = ({ item }: { item: any }) => (
    <View className="px-4">
      <DealCard deal={item} onShowDetails={() => {}} />
    </View>
  )

  const renderSupplierItem = ({ item }: { item: any }) => (
    <View className="px-4">
      <SupplierCard supplier={item} onShowDetails={() => {}} />
    </View>
  )

  const renderContent = () => {
    if (isSearching) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-500">جاري البحث...</Text>
        </View>
      )
    }

    if (searchError) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-center">{searchError}</Text>
        </View>
      )
    }

    if (searchTerm.length < 2) {
      return (
        <View className="flex-1 justify-center items-center opacity-50">
          <Search size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-500">ابحث عن منتجات، عروض، أو موردين</Text>
        </View>
      )
    }

    const hasResults =
      (searchResults.products?.totalItems || 0) > 0 ||
      (searchResults.deals?.length || 0) > 0 ||
      (searchResults.suppliers?.length || 0) > 0

    if (!hasResults) {
      return (
        <View className="flex-1 justify-center items-center opacity-50">
          <Search size={48} color="#9CA3AF" />
          <Text className="mt-4 text-gray-500">لا توجد نتائج لـ "{searchTerm}"</Text>
        </View>
      )
    }

    if (activeTab === "products") {
      return (
        <FlashList<any>
          data={searchResults.products?.items || []}
          keyExtractor={(item: any) => `prod-${item.id}`}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا توجد منتجات مطابقة</Text>}
          estimatedItemSize={250}
          extraData={favoriteIds}
        />
      )
    }

    if (activeTab === "deals") {
      return (
        <FlashList<any>
          data={searchResults.deals || []}
          keyExtractor={(item: any) => `deal-${item.id}`}
          renderItem={renderDealItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا توجد عروض مطابقة</Text>}
          estimatedItemSize={300}
        />
      )
    }

    if (activeTab === "suppliers") {
      return (
        <FlashList<any>
          data={searchResults.suppliers || []}
          keyExtractor={(item: any) => `supp-${item.id}`}
          renderItem={renderSupplierItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-gray-500">لا يوجد موردون مطابقون</Text>}
          estimatedItemSize={100}
        />
      )
    }
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <SafeAreaView className="flex-1 bg-surface">
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-border flex-row items-center">
          <TouchableOpacity onPress={handleClose} className="p-2 bg-surface rounded-full border border-border">
            <ArrowRight size={20} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-surface rounded-2xl px-4 py-2.5 mx-3 border border-border">
            <Search size={20} color="#64748b" />
            <TextInput
              ref={inputRef}
              className="flex-1 ml-3 text-right text-text-main font-medium"
              placeholder="بحث..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={handleSearchTermChange}
              textAlign="right"
              returnKeyType="search"
              style={{ fontFamily: "TajawalCustom" }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchTermChange("")} className="bg-gray-200 p-1 rounded-full">
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        {searchTerm.length >= 2 && (
          <View className="flex-row justify-between px-4 py-3 bg-white border-b border-border z-10">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              let count = 0
              if (tab.id === "products") count = searchResults.products?.totalItems || 0
              if (tab.id === "deals") count = searchResults.deals?.length || 0
              if (tab.id === "suppliers") count = searchResults.suppliers?.length || 0

              if (count === 0 && !isSearching) return null

              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`flex-1 flex-row items-center justify-center py-2.5 mx-1 rounded-xl border ${
                    isActive ? "bg-primary-50 border-primary-200" : "bg-white border-transparent"
                  }`}
                >
                  <Icon size={16} color={isActive ? "#2563eb" : "#64748b"} />
                  <Text
                    className={`ml-2 text-sm font-semibold ${isActive ? "text-primary-600" : "text-text-secondary"}`}
                  >
                    {tab.label} ({count})
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Content */}
        <View className="flex-1">{renderContent()}</View>
      </SafeAreaView>
    </Modal>
  )
}
