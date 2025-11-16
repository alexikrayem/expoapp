import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-ionicons';
import { productService } from '../services/productService';

// Define the navigation stack parameters based on AppNavigator
type AppStackParamList = {
  MainTabs: undefined;
  ProductDetail: { product?: any; productId: string };
  DealDetail: { deal: any; dealId: string };
  SupplierDetail: { supplier: any; supplierId: string };
  FeaturedList: { listId: string; listTitle: string; listDescription?: string; listImage?: string };
};

type ProductDetailScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ProductDetail'>;
type ProductDetailScreenRouteProp = RouteProp<AppStackParamList, 'ProductDetail'>;

// Define the expected navigation props
type ProductDetailScreenProps = {
  navigation: ProductDetailScreenNavigationProp;
  route: ProductDetailScreenRouteProp;
}

// Define reusable icon components for consistency
const HeartOutline = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="heart-outline" size={size} color={color} />
);

const Heart = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="heart" size={size} color={color} />
);

const Cart = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="cart" size={size} color={color} />
);

const Share = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="share" size={size} color={color} />
);

const Close = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="close" size={size} color={color} />
);

const ArrowBack = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="arrow-back" size={size} color={color} />
);

const Star = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="star" size={size} color={color} />
);

// Create a custom hook to provide business logic
const useProductDetailBusinessLogic = () => {
  // In a real app, this would come from CartContext and FavoritesContext
  // For now we'll implement placeholder functions
  const handleAddToCart = (product: any) => {
    // Implementation would come from CartContext
    console.log('Adding to cart:', product?.id);
  };

  const handleToggleFavorite = (productId: string) => {
    // Implementation would come from FavoritesContext
    console.log('Toggling favorite:', productId);
  };

  const handleSelectAlternative = (alternativeId: string) => {
    console.log('Selecting alternative:', alternativeId);
  };

  // Placeholder for favorite IDs - in real app this would come from context
  const favoriteIds = new Set<string>();

  return {
    onAddToCart: handleAddToCart,
    onToggleFavorite: handleToggleFavorite,
    onSelectAlternative: handleSelectAlternative,
    favoriteIds
  };
};

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  image_url: string;
  supplier_name: string;
  effective_selling_price: number;
  original_price?: number;
  on_sale?: boolean;
  images?: string[];
  rating?: number;
  num_reviews?: number;
  alternatives?: ProductDetail[];
  category_name?: string;
  specifications?: Array<{
    name: string;
    value: string;
  }>;
  is_favorite?: boolean;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { onAddToCart, onToggleFavorite, favoriteIds, onSelectAlternative } = useProductDetailBusinessLogic();
  const productId = route?.params?.productId || '';
  const initialProduct = route?.params?.product;
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct || null);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!initialProduct && productId) {
      loadProductDetails();
    }
  }, [productId, initialProduct]);

  const loadProductDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productService.getProductDetailsWithAlternatives(productId);

      if (response.success && response.data) {
        setProduct(response.data as ProductDetail);
      } else {
        setError(response.message || 'Failed to load product details');
      }
    } catch (err) {
      console.error('Error loading product details:', err);
      setError('Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل المنتج...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>خطأ: {error || 'لم يتم العثور على المنتج'}</Text>
      </View>
    );
  }

  const isFavorite = favoriteIds?.has(product.id) || product.is_favorite;

  const allImages = [product.image_url, ...(product.images || [])].filter(img => img);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ArrowBack size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite && onToggleFavorite(product.id)}
        >
          {isFavorite ? (
            <Heart size={24} color="#ef4444" />
          ) : (
            <HeartOutline size={24} color="#6b7280" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Share size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Product Images */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: allImages[selectedImageIndex] || product.image_url || 'https://placehold.co/300x300?text=Product' }}
          style={styles.mainImage}
          resizeMode="contain"
        />

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <View style={styles.thumbnailsContainer}>
            {allImages.map((img, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && styles.selectedThumbnail
                ]}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: img }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfoContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.supplierName}>{product.supplier_name}</Text>

        <View style={styles.ratingContainer}>
          {product.rating && (
            <>
              <Star size={16} color="#f59e0b" />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              {product.num_reviews && (
                <Text style={styles.reviewCount}>({product.num_reviews} تقييمات)</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${product.effective_selling_price}</Text>
          {product.original_price && product.original_price > product.effective_selling_price && (
            <>
              <Text style={styles.originalPrice}>${product.original_price}</Text>
              <Text style={styles.discountText}>
                -{Math.round(((product.original_price - product.effective_selling_price) / product.original_price) * 100)}%
              </Text>
            </>
          )}
        </View>

        {product.category_name && (
          <Text style={styles.category}>{product.category_name}</Text>
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الوصف</Text>
        <Text style={styles.description}>{product.description}</Text>
      </View>

      {/* Specifications */}
      {product.specifications && product.specifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المواصفات</Text>
          <View style={styles.specificationsContainer}>
            {product.specifications.map((spec, index) => (
              <View key={index} style={styles.specificationRow}>
                <Text style={styles.specName}>{spec.name}</Text>
                <Text style={styles.specValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Alternatives */}
      {product.alternatives && product.alternatives.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>منتجات بديلة</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.alternativesContainer}
          >
            {product.alternatives.map((alt) => (
              <TouchableOpacity
                key={alt.id}
                style={styles.alternativeCard}
                onPress={() => {
                  setProduct(alt);
                  setSelectedImageIndex(0);
                }}
              >
                <Image
                  source={{ uri: alt.image_url || 'https://placehold.co/80x80?text=Alt' }}
                  style={styles.alternativeImage}
                  resizeMode="cover"
                />
                <Text style={styles.alternativeName} numberOfLines={1}>{alt.name}</Text>
                <Text style={styles.alternativePrice}>${alt.effective_selling_price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add to Cart Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => onAddToCart && onAddToCart(product)}
        >
          <Cart size={20} color="#fff" />
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
    backgroundColor: '#fff',
    padding: 16,
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  selectedThumbnail: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  productInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  category: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
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
  specificationsContainer: {
    marginTop: 8,
  },
  specificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  specName: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  alternativesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeCard: {
    width: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  alternativeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  alternativeName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 4,
  },
  alternativePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
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

export default ProductDetailScreen;