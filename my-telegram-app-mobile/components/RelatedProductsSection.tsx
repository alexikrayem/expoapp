import React from 'react';
import { View, Text } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useRelatedProducts } from '@/hooks/useRelatedProducts';
import ProductCard from '@/components/ProductCard';
import { useModal } from '@/context/ModalContext';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Product } from '@/types';

// Define the component props
interface RelatedProductsSectionProps {
    currentProductId: string;
    category: string;
}

export const RelatedProductsSection = ({ currentProductId, category }: RelatedProductsSectionProps) => {
    // Cast the hook result to Product[] for better type safety from the source
    const { data: relatedProducts, isLoading } = useRelatedProducts(currentProductId, category) as { data: Product[] | undefined, isLoading: boolean };

    const { openModal } = useModal();
    const { actions: { addToCart } } = useCart();

    // Mock user for favorites
    const telegramUser = { id: 12345 };
    const { isFavorite, toggleFavorite } = useFavorites(telegramUser);

    if (isLoading || !relatedProducts || relatedProducts.length === 0) return null;

    return (
        <View className="mt-4 mb-4">
            <Text className="text-xl font-bold text-text-main mb-4 text-right px-4">منتجات مشابهة</Text>

            <FlashList<Product>
                horizontal
                data={relatedProducts}

                // Explicitly type the item parameter here to eliminate the 'implicit any' error
                renderItem={({ item }: { item: Product }) => (
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
                keyExtractor={(item: Product) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                inverted={true} // RTL support
                estimatedItemSize={172}
            />
        </View>
    );
};