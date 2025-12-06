import React from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Text from '@/components/ThemedText';
import { useCategories } from '@/hooks/useCategories';

interface ProductFilterBarProps {
    currentFilters: any;
    onFiltersChange: (filters: any) => void;
    selectedCityId: string | null;
}

export default function ProductFilterBar({ currentFilters, onFiltersChange, selectedCityId }: ProductFilterBarProps) {
    const { categories: fetchedCategories, isLoadingCategories, categoriesError } = useCategories(selectedCityId);

    // Merge "All" with fetched categories
    const categories = [{ category: 'all', product_count: null }, ...fetchedCategories];

    const handleCategoryClick = (category: string) => {
        if (currentFilters?.category === category) return;

        const newFilters = {
            ...currentFilters,
            category: category
        };

        onFiltersChange(newFilters);
    };

    if (isLoadingCategories) {
        return (
            <View className="h-12 justify-center">
                <ActivityIndicator size="small" color="#2563EB" />
            </View>
        );
    }

    if (categoriesError) {
        return null; // Hide on error
    }

    return (
        <View className="py-2">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
                {categories.map((cat, index) => {
                    const isSelected = currentFilters?.category === cat.category || (cat.category === 'all' && !currentFilters?.category);
                    const displayName = cat.category === 'all' ? 'الكل' : cat.category;
                    const count = cat.product_count ? `(${cat.product_count})` : '';

                    return (
                        <TouchableOpacity
                            key={`${cat.category}-${index}`}
                            onPress={() => handleCategoryClick(cat.category)}
                            className={`px-5 py-3 rounded-full border ${isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text
                                className={`text-base font-medium ${isSelected ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                {displayName} {count}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
