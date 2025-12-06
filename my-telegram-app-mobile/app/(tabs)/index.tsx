import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useProducts } from '@/hooks/useProducts';
import { useDeals } from '@/hooks/useDeals';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useFeaturedItems } from '@/hooks/useFeaturedItems';
import ProductCard from '@/components/ProductCard';
import DealCard from '@/components/DealCard';
import SupplierCard from '@/components/SupplierCard';
import FeaturedSlider from '@/components/FeaturedSlider';
import ProductFilterBar from '@/components/ProductFilterBar';
import { useModal } from '@/context/ModalContext';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Package, Tag, Factory } from 'lucide-react-native';
import { productService } from '@/services/productService';
import { useCart } from '@/context/CartContext';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import Header from '@/components/Header';

const TABS = [
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'exhibitions', label: 'العروض', icon: Tag },
  { id: 'suppliers', label: 'الموردون', icon: Factory },
];

export default function HomeScreen() {
  const [activeSection, setActiveSection] = useState('products');
  const [selectedCityId, setSelectedCityId] = useState<string>('1'); // Default city ID
  const [filters, setFilters] = useState({ category: 'all' });

  // Data Hooks
  const {
    products,
    isLoadingProducts,
    loadMoreProducts,
    hasMorePages,
    isLoadingMore,
    refreshProducts,
    isRefetchingProducts
  } = useProducts(selectedCityId, filters);

  const {
    deals,
    isLoadingDeals,
    refreshDeals,
    isRefetchingDeals
  } = useDeals(selectedCityId);

  const {
    suppliers,
    isLoadingSuppliers,
    refreshSuppliers,
    isRefetchingSuppliers
  } = useSuppliers(selectedCityId);

  const {
    featuredItems,
    isLoadingFeatured,
    refreshFeatured,
    isRefetchingFeatured
  } = useFeaturedItems();

  const { openModal } = useModal();
  const { userProfile } = useAuth();
  const { actions: { addToCart } } = useCart();

  // Initialize useFavorites with current user
  const telegramUser = userProfile || { id: 12345 }; // Fallback for dev
  const { isFavorite, toggleFavorite, favoriteIds, isLoadingFavorites } = useFavorites(telegramUser);

  // Handlers
  const handleShowProductDetails = useCallback((product: any) => {
    openModal('productDetail', { product });
  }, [openModal]);

  const handleShowDealDetails = useCallback((dealId: string) => {
    console.log('Show deal details:', dealId);
  }, []);

  const handleShowSupplierDetails = useCallback((supplierId: string) => {
    console.log('Show supplier details:', supplierId);
  }, []);

  const handleAddToCart = useCallback((product: any) => {
    addToCart(product);
  }, [addToCart]);

  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  const onRefresh = useCallback(() => {
    if (activeSection === 'products') refreshProducts();
    else if (activeSection === 'exhibitions') refreshDeals();
    else if (activeSection === 'suppliers') refreshSuppliers();

    refreshFeatured();
  }, [activeSection, refreshProducts, refreshDeals, refreshSuppliers, refreshFeatured]);

  // Memoized Render Items
  const renderProductItem = useCallback(({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onAddToCart={handleAddToCart}
      onToggleFavorite={handleToggleFavorite}
      onShowDetails={handleShowProductDetails}
      isFavorite={isFavorite(item.id)}
    />
  ), [handleAddToCart, handleToggleFavorite, handleShowProductDetails, isFavorite]);

  const renderDealItem = useCallback(({ item }: { item: any }) => (
    <View className="px-4">
      <DealCard deal={item} onShowDetails={handleShowDealDetails} />
    </View>
  ), [handleShowDealDetails]);

  const renderSupplierItem = useCallback(({ item }: { item: any }) => (
    <View className="px-4">
      <SupplierCard supplier={item} onShowDetails={handleShowSupplierDetails} />
    </View>
  ), [handleShowSupplierDetails]);

  // Render Components
  const renderHeader = () => (
    <View>
      {/* Featured Slider */}
      <FeaturedSlider
        items={featuredItems}
        onSlideClick={(item) => {
          if (item.type === 'product') {
            handleShowProductDetails(item);
          } else if (item.type === 'deal') {
            openModal('dealDetail', { dealId: item.id });
          } else if (item.type === 'supplier') {
            openModal('supplierDetail', { supplierId: item.id });
          } else if (item.type === 'list') {
            openModal('featuredList', { list: item });
          }
        }}
        isLoading={isLoadingFeatured}
      />

      {/* Product Filter Bar - Only show for products tab */}
      {activeSection === 'products' && (
        <ProductFilterBar
          currentFilters={filters}
          onFiltersChange={setFilters}
          selectedCityId={selectedCityId}
        />
      )}
    </View>
  );

  const renderContent = () => {
    if (activeSection === 'products') {
      return (
        <FlashList<any>
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item: any) => `prod-${item.id}`}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          ListHeaderComponent={renderHeader}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" className="py-4" /> : null}
          refreshControl={<RefreshControl refreshing={isRefetchingProducts} onRefresh={onRefresh} />}
          // @ts-ignore
          estimatedItemSize={250}
          extraData={favoriteIds}
        />
      );
    }

    if (activeSection === 'exhibitions') {
      return (
        <FlashList<any>
          data={deals}
          renderItem={renderDealItem}
          keyExtractor={(item: any) => `deal-${item.id}`}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={isRefetchingDeals} onRefresh={onRefresh} />}
          ListEmptyComponent={!isLoadingDeals ? <Text className="text-center text-gray-500 mt-10">لا توجد عروض متاحة حالياً</Text> : null}
          // @ts-ignore
          estimatedItemSize={300}
        />
      );
    }

    if (activeSection === 'suppliers') {
      return (
        <FlashList<any>
          data={suppliers}
          renderItem={renderSupplierItem}
          keyExtractor={(item: any) => `supp-${item.id}`}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={isRefetchingSuppliers} onRefresh={onRefresh} />}
          ListEmptyComponent={!isLoadingSuppliers ? <Text className="text-center text-gray-500 mt-10">لا يوجد موردون متاحون حالياً</Text> : null}
          // @ts-ignore
          estimatedItemSize={100}
        />
      );
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        {/* Fixed Header & Tabs Section */}
        <View className="bg-white z-10 shadow-sm pb-2">
          <Header />
          <View className="flex-row justify-between px-4 py-2">
            {TABS.map((tab) => {
              const isActive = activeSection === tab.id;
              const Icon = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveSection(tab.id)}
                  className={`flex-1 flex-row items-center justify-center py-2.5 mx-1 rounded-full ${isActive
                    ? 'bg-primary-500'
                    : 'bg-gray-100'
                    }`}
                >
                  <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
                  <Text className={`ml-2 text-sm font-bold ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Scrollable Content */}
        {renderContent()}
      </AnimatedScreen>
    </View>
  );
}

