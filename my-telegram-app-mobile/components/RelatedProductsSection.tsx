import React from 'react';
import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useRelatedProducts } from '@/hooks/useRelatedProducts';
import ProductCard from '@/components/ProductCard';
import { useModal } from '@/context/ModalContext';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/hooks/useFavorites';

export const RelatedProductsSection = ({ currentProductId, category }: { currentProductId: string, category: string }) => {
    const { data: relatedProducts, isLoading } = useRelatedProducts(currentProductId, category);
    const { openModal } = useModal();
    const { actions: { addToCart } } = useCart();

    // Mock user for favorites
    const telegramUser = { id: 12345 };
    const { isFavorite, toggleFavorite } = useFavorites(telegramUser);

    if (isLoading || !relatedProducts || relatedProducts.length === 0) return null;

    return (
        <View className="mt-4 mb-4">
            <Text className="text-xl font-bold text-text-main mb-4 text-right px-4">منتجات مشابهة</Text>
            <FlashList
                horizontal
                data={relatedProducts}
                renderItem={({ item }) => (
                    <View style={{ width: 160, marginRight: 12, height: 240 }}>
                        <ProductCard
                            product={item}
                            onAddToCart={() => addToCart(item)}
                            onToggleFavorite={() => toggleFavorite(item.id)}
                            onShowDetails={() => openModal("productDetail", { product: item })}
                            isFavorite={isFavorite(item.id)}
                        />
                    </View>
                )}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                inverted={true} // RTL support
                estimatedItemSize={172}
            />
        </View>
    );
};
