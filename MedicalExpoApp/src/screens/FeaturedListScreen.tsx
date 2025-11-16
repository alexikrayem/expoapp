import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-ionicons';
import { productService } from '../services/productService';

// Define the navigation stack parameters based on AppNavigator
type AppStackParamList = {
  MainTabs: undefined;
  ProductDetail: { product: any; productId: string };
  DealDetail: { deal: any; dealId: string };
  SupplierDetail: { supplier: any; supplierId: string };
  FeaturedList: { listId: string; listTitle: string; listDescription?: string; listImage?: string };
};

type FeaturedListScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'FeaturedList'>;
type FeaturedListScreenRouteProp = RouteProp<AppStackParamList, 'FeaturedList'>;

type FeaturedListScreenProps = {
  navigation: FeaturedListScreenNavigationProp;
  route: FeaturedListScreenRouteProp;
};

interface Product {
  id: string;
  name: string;
  image_url: string;
  supplier_name: string;
  effective_selling_price: number;
  original_price?: number;
  is_favorite?: boolean;
  on_sale?: boolean;
}

const FeaturedListScreen: React.FC<FeaturedListScreenProps> = ({ route, navigation }) => {
  const { listId, listTitle, listDescription, listImage } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [listId]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call to get products for a featured list
      // For now, we'll simulate by fetching some products
      const response: any = await productService.getProducts({ 
        featuredListId: listId,
        limit: 20 
      });
      
      if (response.success && response.data) {
        setProducts(response.data.items || []);
      } else {
        setError(response.message || 'Failed to load products');
      }
    } catch (err) {
      console.error('Error loading featured list products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', {
      product: product,
      productId: product.id,
    });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => handleProductPress(item)}
    >
      <Image 
        source={{ uri: item.image_url || 'https://placehold.co/150x150?text=No+Image' }} 
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.supplierName} numberOfLines={1}>{item.supplier_name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${item.effective_selling_price}</Text>
          {item.original_price && item.original_price > item.effective_selling_price && (
            <Text style={styles.originalPrice}>${item.original_price}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      {listImage && (
        <Image 
          source={{ uri: listImage }} 
          style={styles.listImage}
          resizeMode="cover"
        />
      )}
      <Text style={styles.listTitle}>{listTitle}</Text>
      {listDescription ? (
        <Text style={styles.listDescription}>{listDescription}</Text>
      ) : null}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading featured items...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.contentContainer}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No products in this list</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
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
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  listImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  listDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
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
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 150,
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
});

export default FeaturedListScreen;