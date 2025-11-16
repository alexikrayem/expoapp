import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../context/AppContext';
import { RefreshCw } from 'react-native-feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { cityService } from '../services/cityService';

// Define the navigation stack parameters
type SuppliersStackParamList = {
  SuppliersList: undefined;
  SupplierDetail: { supplier: any };
};

type SuppliersScreenNavigationProp = NativeStackNavigationProp<SuppliersStackParamList, 'SuppliersList'>;
type SuppliersScreenRouteProp = RouteProp<SuppliersStackParamList, 'SuppliersList'>;

interface Supplier {
  id: string;
  name: string;
  image_url?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  rating?: number;
  num_reviews?: number;
}

// Define the expected navigation props
type SuppliersScreenProps = {
  navigation: SuppliersScreenNavigationProp;
  route: SuppliersScreenRouteProp;
}

// Create a custom hook to provide business logic
const useSuppliersBusinessLogic = () => {
  // In a real app, this would come from CartContext and FavoritesContext
  // For now we'll implement placeholder functions
  const handleAddToCart = (product: any) => {
    // Implementation would come from CartContext
    console.log('Adding to cart:', product?.id);
  };

  const handleToggleFavorite = (supplierId: string) => {
    // Implementation would come from FavoritesContext
    console.log('Toggling favorite supplier:', supplierId);
  };

  // Placeholder for favorite IDs - in real app this would come from context
  const favoriteIds = new Set<string>();

  return {
    onAddToCart: handleAddToCart,
    onToggleFavorite: handleToggleFavorite,
    favoriteIds
  };
};

const Building2 = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="business" size={size} color={color} />
);

const MapPin = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="location" size={size} color={color} />
);

const Phone = ({ size, color }: { size: number; color: string }) => (
  <Ionicons name="call" size={size} color={color} />
);

const SupplierCard: React.FC<{
  supplier: Supplier,
  navigateToDetails: () => void,
  onToggleFavorite: (supplierId: string) => void,
  isFavorite: boolean
}> = ({ supplier, navigateToDetails, onToggleFavorite, isFavorite }) => {
  return (
    <TouchableOpacity style={styles.supplierCard} onPress={navigateToDetails}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: supplier.image_url || 'https://placehold.co/80x80?text=Supplier' }}
          style={styles.supplierImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite(supplier.id);
          }}
        >
          {isFavorite ? (
            <Building2 size={20} color="#ef4444" />
          ) : (
            <Building2 size={20} color="#6b7280" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.supplierInfo}>
        <Text style={styles.supplierName} numberOfLines={1}>{supplier.name}</Text>
        <Text style={styles.supplierDescription} numberOfLines={2}>{supplier.description}</Text>

        {supplier.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>★ {supplier.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({supplier.num_reviews || 0})</Text>
          </View>
        )}

        {supplier.address && (
          <View style={styles.addressContainer}>
            <MapPin size={12} color="#6b7280" />
            <Text style={styles.addressText} numberOfLines={1}>{supplier.address}</Text>
          </View>
        )}

        {supplier.phone && (
          <View style={styles.phoneContainer}>
            <Phone size={12} color="#6b7280" />
            <Text style={styles.phoneText}>{supplier.phone}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SuppliersScreen: React.FC<SuppliersScreenProps> = ({ navigation, route }) => {
  const { onAddToCart, onToggleFavorite, favoriteIds } = useSuppliersBusinessLogic();
  const { user: userProfile } = useAppContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [userProfile?.selected_city_id]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await cityService.getSuppliers(userProfile?.selected_city_id || '1');

      if (response.success && response.data) {
        setSuppliers(response.data);
      } else {
        setError(response.message || 'Failed to load suppliers');
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  };

  const handleShowSupplierDetails = (supplierId: string) => {
    navigation.navigate('SupplierDetail', {
      supplierId,
    });
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <SupplierCard
      supplier={item}
      navigateToDetails={() => handleShowSupplierDetails(item.id)}
      onToggleFavorite={onToggleFavorite}
      isFavorite={favoriteIds.has(item.id)}
    />
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>خطأ: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <RefreshCw size={16} color="#fff" />
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل الموردين...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الموردون المتوفرة</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <RefreshCw size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {suppliers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>لا توجد موردون حالياً</Text>
          <Text style={styles.emptySubtext}>جاري تحديث الموردين تباعاً</Text>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          renderItem={renderSupplier}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  contentContainer: {
    padding: 12,
  },
  supplierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  supplierImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  supplierInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  supplierDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
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
    paddingTop: 60,
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

export default SuppliersScreen;