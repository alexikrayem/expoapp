import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { cityService } from '../services/cityService';
import { productService } from '../services/productService';

// Define route params type
type SupplierDetailRouteProp = RouteProp<{
  SupplierDetail: {
    supplierId: string;
    selectedCityId?: string;
    onSearchSupplier?: (supplierName: string) => void;
  };
}, 'SupplierDetail'>;

interface SupplierDetailScreenProps {
  route?: SupplierDetailRouteProp;
  onAddToCart?: (product: any) => void;
  onToggleFavorite?: (supplierId: string) => void;
  favoriteIds?: Set<string>;
}

interface SupplierDetail {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  rating?: number;
  num_reviews?: number;
  products?: Array<{
    id: string;
    name: string;
    image_url: string;
    supplier_name: string;
    effective_selling_price: number;
    original_price?: number;
  }>;
  is_favorite?: boolean;
}

interface Product {
  id: string;
  name: string;
  image_url: string;
  supplier_name: string;
  effective_selling_price: number;
  original_price?: number;
}

const ProductCard: React.FC<{
  product: Product,
  onPress: () => void,
  onAddToCart: (product: Product) => void
}> = ({ product, onPress, onAddToCart }) => {
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <Image
        source={{ uri: product.image_url || 'https://placehold.co/80x80?text=Product' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
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
          <Icon name="cart" size={12} color="#fff" />
          <Text style={styles.addToCartText}>أضف</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const SupplierDetailScreen: React.FC<SupplierDetailScreenProps> = ({
  route,
  onAddToCart,
  onToggleFavorite,
  favoriteIds
}) => {
  const supplierId = route?.params?.supplierId || '';
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierId) {
      loadSupplierDetails();
    }
  }, [supplierId]);

  const loadSupplierDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await cityService.getSupplierDetails(supplierId);

      if (response.success && response.data) {
        setSupplier(response.data);
      } else {
        setError(response.message || 'Failed to load supplier details');
      }
    } catch (err) {
      console.error('Error loading supplier details:', err);
      setError('Failed to load supplier details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل المورد...</Text>
      </View>
    );
  }

  if (error || !supplier) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>خطأ: {error || 'لم يتم العثور على المورد'}</Text>
      </View>
    );
  }

  const isFavorite = favoriteIds?.has(supplier.id) || supplier.is_favorite;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite && onToggleFavorite(supplier.id)}
        >
          {isFavorite ? (
            <Icon name="heart" size={24} color="#ef4444" />
          ) : (
            <Icon name="heart-outline" size={24} color="#6b7280" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Icon name="share-social" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Supplier Info */}
      <View style={styles.supplierInfoContainer}>
        <Image
          source={{ uri: supplier.image_url || 'https://placehold.co/100x100?text=Supplier' }}
          style={styles.supplierImage}
          resizeMode="cover"
        />
        <View style={styles.supplierTextContainer}>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          {supplier.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#f59e0b" />
              <Text style={styles.ratingText}>{supplier.rating.toFixed(1)}</Text>
              {supplier.num_reviews && (
                <Text style={styles.reviewCount}>({supplier.num_reviews} تقييمات)</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Supplier Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نبذة عن المورد</Text>
        <Text style={styles.description}>{supplier.description}</Text>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات الاتصال</Text>
        <View style={styles.contactContainer}>
          {supplier.address && (
            <View style={styles.contactItem}>
              <Icon name="location" size={20} color="#6b7280" />
              <Text style={styles.contactText}>{supplier.address}</Text>
            </View>
          )}
          {supplier.phone && (
            <View style={styles.contactItem}>
              <Icon name="call" size={20} color="#6b7280" />
              <Text style={styles.contactText}>{supplier.phone}</Text>
            </View>
          )}
          {supplier.email && (
            <View style={styles.contactItem}>
              <Icon name="mail" size={20} color="#6b7280" />
              <Text style={styles.contactText}>{supplier.email}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Products by Supplier */}
      {supplier.products && supplier.products.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المنتجات من هذا المورد</Text>
          <FlatList
            data={supplier.products}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => {}}
                onAddToCart={onAddToCart || (() => {})}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {supplier.phone && (
          <TouchableOpacity style={styles.contactButton}>
            <Icon name="call" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>الاتصال</Text>
          </TouchableOpacity>
        )}
        {supplier.email && (
          <TouchableOpacity style={styles.messageButton}>
            <Icon name="mail" size={20} color="#fff" />
            <Text style={styles.messageButtonText}>مراسلة</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  },
  loadingText: {
    marginTop: 16,
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  supplierInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  supplierTextContainer: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  contactContainer: {
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
});

export default SupplierDetailScreen;