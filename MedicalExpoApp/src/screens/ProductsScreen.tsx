import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../context/AppContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { productService } from '../services/productService';

// Define the navigation stack parameters
type ProductsStackParamList = {
  ProductsList: undefined;
  ProductDetail: { product: any };
};

type ProductsScreenNavigationProp = NativeStackNavigationProp<ProductsStackParamList, 'ProductsList'>;
type ProductsScreenRouteProp = RouteProp<ProductsStackParamList, 'ProductsList'>;

interface Product {
  id: string;
  name: string;
  image_url: string;
  supplier_name: string;
  effective_selling_price: number;
  original_price?: number;
  is_favorite?: boolean;
  on_sale?: boolean;
  category_name?: string;
}

// For compatibility with navigation, the screen component will accept navigation props
// but we can still have our custom props passed through a different mechanism
// Let's use context or a custom hook for these business logic props instead

// Define the expected navigation props
type ProductsScreenProps = {
  navigation: ProductsScreenNavigationProp;
  route: ProductsScreenRouteProp;
}

// Define reusable icon components for consistency with Suppliers screen
const Filter = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="filter" size={size} color={color} />
);

const ProductCard: React.FC<{
  product: Product,
  onAddToCart: (product: Product) => void,
  onToggleFavorite: (productId: string) => void,
  navigateToDetails: (product: Product) => void,
  isFavorite: boolean
}> = ({ product, onAddToCart, onToggleFavorite, navigateToDetails, isFavorite }) => {
  return (
    <TouchableOpacity style={styles.productCard} onPress={() => navigateToDetails(product)}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image_url || 'https://placehold.co/150x150?text=No+Image' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
        >
          {isFavorite ? (
            <Ionicons name="heart" size={20} color="#ef4444" />
          ) : (
            <Ionicons name="heart-outline" size={20} color="#6b7280" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.supplierName} numberOfLines={1}>{product.supplier_name}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${product.effective_selling_price}</Text>
          {product.original_price && product.original_price > product.effective_selling_price && (
            <Text style={styles.originalPrice}>${product.original_price}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => onAddToCart(product)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addToCartText}>أضف إلى السلة</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Create a custom hook to provide business logic
const useProductsBusinessLogic = () => {
  // In a real app, this would come from CartContext, FavoritesContext, etc.
  // For now we'll implement placeholder functions
  const handleAddToCart = (product: Product) => {
    // Implementation would come from CartContext
    console.log('Adding to cart:', product.id);
  };

  const handleToggleFavorite = (productId: string) => {
    // Implementation would come from FavoritesContext
    console.log('Toggling favorite:', productId);
  };

  // Placeholder for favorite IDs - in real app this would come from context
  const favoriteProductIds = new Set<string>();

  return {
    onAddToCart: handleAddToCart,
    onToggleFavorite: handleToggleFavorite,
    favoriteProductIds
  };
};

// For now, we'll create a wrapper component that can handle the business logic props
// The screen component itself will handle navigation
const ProductsScreen: React.FC<ProductsScreenProps> = ({ navigation, route }) => {
  const { onAddToCart, onToggleFavorite, favoriteProductIds } = useProductsBusinessLogic();
  const { user: userProfile } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filters state
  const [currentFilters, setCurrentFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    onSale: false,
  });

  // Local state for advanced filters
  const [localAdvancedFilters, setLocalAdvancedFilters] = useState({
    minPrice: currentFilters.minPrice || '',
    maxPrice: currentFilters.maxPrice || '',
    onSale: currentFilters.onSale || false,
  });

  useEffect(() => {
    loadProducts(true);
  }, [userProfile?.selected_city_id, currentFilters]);

  const loadProducts = async (reset: boolean = false) => {
    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params: any = {
        cityId: userProfile?.selected_city_id,
        page: reset ? 1 : currentPage,
        limit: 20,
        ...currentFilters,
      };

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === 'all') {
          delete params[key];
        }
      });

      const response: any = await productService.getProducts(params);

      if (response.success && response.data) {
        if (reset) {
          setProducts(response.data.items || []);
          setCurrentPage(1);
          setHasMorePages(response.data.hasNextPage || false);
        } else {
          setProducts(prev => [...prev, ...(response.data.items || [])]);
          setCurrentPage(prev => prev + 1);
          setHasMorePages(response.data.hasNextPage || false);
        }
      } else {
        setError(response.message || 'Failed to load products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMorePages && !isLoadingMore && !isLoading) {
      loadProducts(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  const handleAdvancedFilterChange = (filterKey: string, value: string | boolean) => {
    setLocalAdvancedFilters(prev => ({ ...prev, [filterKey]: value }));
  };

  const applyAdvancedFilters = () => {
    // Merge local advanced filters with the current filters
    const newFilters = {
      ...currentFilters,
      ...localAdvancedFilters
    };
    setCurrentFilters(newFilters);
    setShowAdvancedFilters(false);
  };

  const clearAdvancedFilters = () => {
    const clearedAdvancedFilters = {
      minPrice: '',
      maxPrice: '',
      onSale: false
    };
    setLocalAdvancedFilters(clearedAdvancedFilters);

    // Merge cleared advanced filters with the current filters
    const newFilters = {
      ...currentFilters,
      ...clearedAdvancedFilters
    };
    setCurrentFilters(newFilters);
    setShowAdvancedFilters(false);
  };

  const hasActiveAdvancedFilters = currentFilters.minPrice || currentFilters.maxPrice || currentFilters.onSale;

  const handleShowProductDetails = (product: Product) => {
    navigation.navigate('ProductDetail', {
      product: product,
      productId: product.id,
    } as any);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onAddToCart={onAddToCart}
      onToggleFavorite={onToggleFavorite}
      navigateToDetails={handleShowProductDetails}
      isFavorite={favoriteProductIds.has(item.id)}
    />
  );

  const renderFooter = () => {
    if (!hasMorePages) return null;
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingMoreText}>جاري تحميل المزيد...</Text>
        </View>
      );
    }
    return null;
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>خطأ: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>المنتجات المعروضة</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={[
            styles.filterButton,
            (hasActiveAdvancedFilters || showAdvancedFilters)
              ? styles.activeFilterButton
              : styles.inactiveFilterButton
          ]}
        >
          <Filter size={20} color={hasActiveAdvancedFilters || showAdvancedFilters ? "#fff" : "#6b7280"} />
          <Text style={[
            styles.filterButtonText,
            (hasActiveAdvancedFilters || showAdvancedFilters)
              ? styles.activeFilterButtonText
              : styles.inactiveFilterButtonText
          ]}>
            فلاتر متقدمة
          </Text>
          {hasActiveAdvancedFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <View style={styles.advancedFiltersContainer}>
          <View style={styles.advancedFiltersHeader}>
            <Text style={styles.advancedFiltersTitle}>فلاتر متقدمة</Text>
            <TouchableOpacity onPress={() => setShowAdvancedFilters(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {/* Price Range */}
            <View style={styles.priceFilterContainer}>
              <Text style={styles.filterLabel}>السعر الأدنى</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencyLabel}>$</Text>
                <TextInput
                  placeholder="0"
                  value={localAdvancedFilters.minPrice}
                  onChangeText={(text) => handleAdvancedFilterChange('minPrice', text)}
                  style={styles.priceInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.priceFilterContainer}>
              <Text style={styles.filterLabel}>السعر الأعلى</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencyLabel}>$</Text>
                <TextInput
                  placeholder="1000"
                  value={localAdvancedFilters.maxPrice}
                  onChangeText={(text) => handleAdvancedFilterChange('maxPrice', text)}
                  style={styles.priceInput}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* On Sale Filter */}
          <View style={styles.onSaleFilterContainer}>
            <TouchableOpacity
              onPress={() => handleAdvancedFilterChange('onSale', !localAdvancedFilters.onSale)}
              style={[
                styles.checkbox,
                localAdvancedFilters.onSale && styles.checkboxChecked
              ]}
            >
              {localAdvancedFilters.onSale && <Text style={styles.checkboxText}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.onSaleLabel}>المنتجات المخفضة فقط</Text>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyFilterButton} onPress={applyAdvancedFilters}>
              <Text style={styles.applyFilterButtonText}>تطبيق الفلاتر</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearFilterButton} onPress={clearAdvancedFilters}>
              <Text style={styles.clearFilterButtonText}>مسح الفلاتر</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.contentContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>لا توجد منتجات تطابق الفلاتر المحددة.</Text>
              <Text style={styles.emptySubtext}>جرب تعديل الفلاتر أو البحث عن شيء آخر.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  inactiveFilterButton: {
    backgroundColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  inactiveFilterButtonText: {
    color: '#6b7280',
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  advancedFiltersContainer: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  advancedFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  advancedFiltersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceFilterContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  currencyLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  priceSeparator: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  inputContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
  },
  onSaleFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  onSaleLabel: {
    fontSize: 14,
    color: '#374151',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  applyFilterButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 4,
  },
  applyFilterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearFilterButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 4,
  },
  clearFilterButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProductsScreen;