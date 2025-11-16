import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-ionicons';
import { cityService } from '../services/cityService';

// Define route params type
type DealDetailRouteProp = RouteProp<{
  DealDetail: {
    dealId: string;
  };
}, 'DealDetail'>;

interface DealDetailScreenProps {
  route?: DealDetailRouteProp;
  onProductClick?: (productId: string) => void;
  onSupplierClick?: (supplierId: string) => void;
  onAddToCart?: (product: any) => void;
  onToggleFavorite?: (dealId: string) => void;
  favoriteIds?: Set<string>;
}

interface DealDetail {
  id: string;
  title: string;
  description: string;
  image_url: string;
  supplier_name: string;
  supplier_id: string;
  discount_percentage?: number;
  start_date?: string;
  end_date?: string;
  location?: string;
  price: number;
  original_price?: number;
  rating?: number;
  num_reviews?: number;
  products?: Array<{
    id: string;
    name: string;
    image_url: string;
    effective_selling_price: number;
    original_price?: number;
  }>;
  is_favorite?: boolean;
}

const DealDetailScreen: React.FC<DealDetailScreenProps> = ({
  route,
  onProductClick,
  onSupplierClick,
  onAddToCart,
  onToggleFavorite,
  favoriteIds
}) => {
  const dealId = route?.params?.dealId || '';
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dealId) {
      loadDealDetails();
    }
  }, [dealId]);

  const loadDealDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await cityService.getDealDetails(dealId);

      if (response.success && response.data) {
        setDeal(response.data as DealDetail);
      } else {
        setError(response.message || 'Failed to load deal details');
      }
    } catch (err) {
      console.error('Error loading deal details:', err);
      setError('Failed to load deal details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل العرض...</Text>
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>خطأ: {error || 'لم يتم العثور على العرض'}</Text>
      </View>
    );
  }

  const isFavorite = favoriteIds?.has(deal.id) || deal.is_favorite;
  const discountPercent = deal.discount_percentage ||
    (deal.original_price && deal.price && deal.original_price > 0
      ? Math.round(((deal.original_price - deal.price) / deal.original_price) * 100)
      : 0);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite && onToggleFavorite(deal.id)}
        >
          {isFavorite ? (
            <Ionicons name="heart" size={24} color="#ef4444" />
          ) : (
            <Ionicons name="heart-outline" size={24} color="#6b7280" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Deal Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: deal.image_url || 'https://placehold.co/300x200?text=Deal' }}
          style={styles.mainImage}
          resizeMode="cover"
        />

        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
      </View>

      {/* Deal Info */}
      <View style={styles.dealInfoContainer}>
        <Text style={styles.dealTitle}>{deal.title}</Text>
        <Text style={styles.dealDescription}>{deal.description}</Text>

        <View style={styles.supplierContainer}>
          <TouchableOpacity
            style={styles.supplierButton}
            onPress={() => onSupplierClick && onSupplierClick(deal.supplier_id)}
          >
            <Text style={styles.supplierName}>{deal.supplier_name}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${deal.price}</Text>
          {deal.original_price && deal.original_price > deal.price && (
            <>
              <Text style={styles.originalPrice}>${deal.original_price}</Text>
              <Text style={styles.discountText}>
                -{Math.round(((deal.original_price - deal.price) / deal.original_price) * 100)}%
              </Text>
            </>
          )}
        </View>

        {deal.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>{deal.rating.toFixed(1)}</Text>
            {deal.num_reviews && (
              <Text style={styles.reviewCount}>({deal.num_reviews} تقييمات)</Text>
            )}
          </View>
        )}

        {deal.start_date && deal.end_date && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateText}>
                {new Date(deal.start_date).toLocaleDateString()} - {new Date(deal.end_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {deal.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="map" size={16} color="#6b7280" />
            <Text style={styles.locationText}>{deal.location}</Text>
          </View>
        )}
      </View>

      {/* Deal Products */}
      {deal.products && deal.products.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المنتجات في هذا العرض</Text>
          <View style={styles.productsContainer}>
            {deal.products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => onProductClick && onProductClick(product.id)}
              >
                <Image
                  source={{ uri: product.image_url || 'https://placehold.co/60x60?text=Product' }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productPrice}>${product.effective_selling_price}</Text>
                  {product.original_price && product.original_price > product.effective_selling_price && (
                    <Text style={styles.productOriginalPrice}>${product.original_price}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => {
            if (deal.products && deal.products.length > 0) {
              // For deals, add the first product to cart
              onAddToCart && onAddToCart(deal.products[0]);
            }
          }}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.addToCartText}>أضف إلى السلة</Text>
        </TouchableOpacity>
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
  imageContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: '#f3f4f6',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dealInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
  },
  dealTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  dealDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  supplierContainer: {
    marginBottom: 16,
  },
  supplierButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  supplierName: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  priceDiscountText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginLeft: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dateTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#4b5563',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
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
  productsContainer: {
    flexDirection: 'column',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  productOriginalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
});

export default DealDetailScreen;