/// <reference types="nativewind/types" />
import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useFavoriteProducts } from '@/hooks/useFavoriteProducts';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';
import ProductCard from '@/components/ProductCard';
import { Search, X, Heart } from 'lucide-react-native';
import AnimatedScreen from '@/components/ui/AnimatedScreen';

export default function FavoritesScreen() {
  const { userProfile } = useAuth();

  // Use userProfile as the user object, assuming it has an id
  // If userProfile is null, useFavorites should handle it gracefully or we pass null
  const { favoriteIds, toggleFavorite, isLoadingFavorites } = useFavorites(userProfile);
  const { favoriteProducts, isLoadingFavoritesTab, favoritesTabError } = useFavoriteProducts(favoriteIds, true);
  const { actions: { addToCart } } = useCart();
  const { openModal } = useModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const isLoading = isLoadingFavorites || isLoadingFavoritesTab;

  // Derive categories from favorite products
  const categories = useMemo(() => {
    if (!favoriteProducts) return [{ id: 'all', name: 'الكل', count: 0 }];

    const categoryMap = new Map();
    favoriteProducts.forEach(p => {
      if (p.category) {
        categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
      }
    });

    const cats = Array.from(categoryMap.entries()).map(([name, count]) => ({
      id: name,
      name,
      count
    }));

    return [{ id: 'all', name: 'الكل', count: favoriteProducts.length }, ...cats];
  }, [favoriteProducts]);

  const filteredProducts = useMemo(() => {
    if (!favoriteProducts) return [];
    let filtered = favoriteProducts;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [favoriteProducts, activeCategory, searchQuery]);

  const handleShowDetails = (product: any) => {
    openModal('productDetail', { product });
  };

  if (favoritesTabError) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-500">Error: {favoritesTabError}</Text>
      </SafeAreaView>
    );
  }

  const renderSkeleton = () => (
    <View className="flex-1 p-3">
      <View className="flex-row flex-wrap justify-between">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} className="w-[48%] mb-4 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <View className="h-40 bg-gray-200 animate-pulse" />
            <View className="p-3 space-y-2">
              <View className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <View className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              <View className="flex-row justify-between items-center mt-2">
                <View className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                <View className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <AnimatedScreen>
        <View className="bg-white shadow-sm mb-1 border-b border-border z-10">
          <View className="p-6 pb-4">
            <Text className="text-3xl font-bold text-text-main mb-4 text-right">المفضلة</Text>
            <View className="flex-row items-center bg-surface rounded-2xl px-4 h-12 border border-border">
              <Search size={20} color="#64748b" />
              <TextInput
                className="flex-1 ml-3 text-right text-text-main font-medium"
                placeholder="ابحث في المفضلة..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="bg-gray-200 p-1 rounded-full">
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Categories Filter */}
          {!isLoading && categories.length > 1 && (
            <FlashList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
              // @ts-ignore
              estimatedItemSize={80}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setActiveCategory(item.id)}
                  className={`mr-2 px-5 py-3 rounded-full border ${activeCategory === item.id
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-200'
                    }`}
                >
                  <Text className={`text-base font-medium ${activeCategory === item.id ? 'text-white' : 'text-gray-700'}`}>
                    {item.name} <Text className={`text-xs ${activeCategory === item.id ? 'text-white/80' : 'text-gray-400'}`}>({item.count})</Text>
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {isLoading ? (
          renderSkeleton()
        ) : filteredProducts.length > 0 ? (
          <FlashList<any>
            data={filteredProducts}
            renderItem={({ item }: { item: any }) => (
              <ProductCard
                product={item}
                onAddToCart={addToCart}
                onToggleFavorite={toggleFavorite}
                onShowDetails={handleShowDetails}
                isFavorite={favoriteIds.has(item.id)}
              />
            )}
            keyExtractor={(item: any) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={{ padding: 12 }}
            // @ts-ignore
            estimatedItemSize={250}
            extraData={favoriteIds}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <View className="bg-red-50 p-8 rounded-full mb-6 shadow-sm">
              <Heart size={56} color="#ef4444" fill="#ef4444" />
            </View>
            <Text className="text-2xl font-bold text-text-main mb-3">
              {searchQuery || activeCategory !== 'all' ? 'لا توجد نتائج' : 'قائمة المفضلة فارغة'}
            </Text>
            <Text className="text-text-secondary text-center leading-6 text-base px-8">
              {searchQuery || activeCategory !== 'all'
                ? 'جرب تغيير فلاتر البحث أو التصنيف'
                : 'أضف منتجات تعجبك بالضغط على أيقونة القلب لتجدها هنا!'}
            </Text>
          </View>
        )}
      </AnimatedScreen>
    </View>
  );
}
