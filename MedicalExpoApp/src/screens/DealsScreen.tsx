import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../context/AppContext';
import Ionicons from 'react-native-ionicons';
import { cityService } from '../services/cityService';

// Define the navigation stack parameters
type DealsStackParamList = {
  DealsList: undefined;
  DealDetail: { deal: any };
};

type DealsScreenNavigationProp = NativeStackNavigationProp<DealsStackParamList, 'DealsList'>;
type DealsScreenRouteProp = RouteProp<DealsStackParamList, 'DealsList'>;

interface Deal {
  id: string;
  title: string;
  description: string;
  image_url: string;
  supplier_name: string;
  discount_percentage?: number;
  start_date?: string;
  end_date?: string;
  location?: string;
  price: number;
  original_price?: number;
}

// Define the expected navigation props
type DealsScreenProps = {
  navigation: DealsScreenNavigationProp;
  route: DealsScreenRouteProp;
}

// Create a custom hook to provide business logic
const useDealsBusinessLogic = () => {
  // In a real app, this would come from CartContext
  // For now we'll implement a placeholder function
  const handleAddToCart = (product: any) => {
    // Implementation would come from CartContext
    console.log('Adding to cart:', product?.id);
  };

  return {
    onAddToCart: handleAddToCart
  };
};

const DealCard: React.FC<{
  deal: Deal,
  navigateToDetails: () => void
}> = ({ deal, navigateToDetails }) => {
  const discountPercent = deal.discount_percentage ||
    (deal.original_price && deal.price && deal.original_price > 0
      ? Math.round(((deal.original_price - deal.price) / deal.original_price) * 100)
      : 0);

  return (
    <TouchableOpacity style={styles.dealCard} onPress={navigateToDetails}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: deal.image_url || 'https://placehold.co/150x100?text=No+Image' }}
          style={styles.dealImage}
          resizeMode="cover"
        />
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
        <Text style={styles.dealDescription} numberOfLines={2}>{deal.description}</Text>
        <Text style={styles.supplierName}>{deal.supplier_name}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${deal.price}</Text>
          {deal.original_price && deal.original_price > deal.price && (
            <Text style={styles.originalPrice}>${deal.original_price}</Text>
          )}
        </View>

        {deal.start_date && deal.end_date && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={12} color="#6b7280" />
            <Text style={styles.dateText}>
              {new Date(deal.start_date).toLocaleDateString()} - {new Date(deal.end_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {deal.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="map" size={12} color="#6b7280" />
            <Text style={styles.locationText}>{deal.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const DealsScreen: React.FC<DealsScreenProps> = ({ navigation, route }) => {
  const { onAddToCart } = useDealsBusinessLogic();
  const { user: userProfile } = useAppContext();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeals();
  }, [userProfile?.selected_city_id]);

  const loadDeals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: any = await cityService.getDeals(userProfile?.selected_city_id || '1');

      if (response.success && response.data) {
        setDeals(response.data);
      } else {
        setError(response.message || 'Failed to load deals');
      }
    } catch (err) {
      console.error('Error loading deals:', err);
      setError('Failed to load deals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeals();
    setRefreshing(false);
  };

  const handleShowDealDetails = (dealId: string) => {
    navigation.navigate('DealDetail', {
      dealId,
    } as any);
  };

  const renderDeal = ({ item }: { item: Deal }) => (
    <DealCard
      deal={item}
      navigateToDetails={() => handleShowDealDetails(item.id)}
    />
  );

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>العروض المتوفرة</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {deals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>لا توجد عروض حالياً</Text>
          <Text style={styles.emptySubtext}>جاري تحديث العروض تباعاً</Text>
        </View>
      ) : (
        <FlatList
          data={deals}
          renderItem={renderDeal}
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
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  dealImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dealInfo: {
    padding: 12,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  supplierName: {
    fontSize: 12,
    color: '#8b949e',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    marginLeft: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
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

export default DealsScreen;