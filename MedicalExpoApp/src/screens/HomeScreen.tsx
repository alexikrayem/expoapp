import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { useCache } from '../context/CacheContext';
import { productService } from '../services/productService';
import FeaturedSlider from '../components/FeaturedSlider';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user: userProfile } = useAppContext();
  const { actions: { addToCart } } = useCart();
  const { cachedApiCall } = useCache();

  const [featuredItems, setFeaturedItems] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoadingFeatured(true);
      try {
        const data = await cachedApiCall(
          'featured_items',
          () => productService.getFeaturedItems(),
          10 * 60 * 1000, // 10 minutes cache for featured items
        );
        setFeaturedItems(data || []);
      } catch (err) {
        console.error('Failed to fetch featured items:', err);
      } finally {
        setIsLoadingFeatured(false);
      }
    };
    fetchFeatured();
  }, [cachedApiCall]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await cachedApiCall(
        'featured_items',
        () => productService.getFeaturedItems(),
        10 * 60 * 1000,
      );
      setFeaturedItems(data || []);
    } catch (err) {
      console.error('Failed to refresh featured items:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleShowProductDetails = (product: any) => {
    if (!product || !product.id) return;
    navigation.navigate('ProductDetail', {
      product: product,
      productId: product.id,
    });
  };

  const handleShowDealDetails = (dealId: string) => {
    if (!dealId) return;
    navigation.navigate('DealDetail', {
      dealId,
    });
  };

  const handleShowSupplierDetails = (supplierId: string) => {
    if (!supplierId) return;
    navigation.navigate('SupplierDetail', {
      supplierId,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Featured Slider */}
      <View style={styles.featuredSliderContainer}>
        <FeaturedSlider
          isLoading={isLoadingFeatured}
          items={featuredItems}
          onSlideClick={(item: any) => {
            if (item.type === 'product') handleShowProductDetails(item);
            if (item.type === 'deal') handleShowDealDetails(item.id);
            if (item.type === 'supplier') handleShowSupplierDetails(item.id);
          }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  featuredSliderContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});

export default HomeScreen;