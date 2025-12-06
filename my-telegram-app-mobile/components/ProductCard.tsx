/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/ThemedText';
import { ShoppingCart, Heart } from 'lucide-react-native';
import { useCurrency } from '../context/CurrencyContext';
import { Link } from 'expo-router';
import { Skeleton } from './ui/Skeleton';
import { haptics } from '@/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';

interface Product {
    id: string;
    name: string;
    price: number;
    effective_selling_price: number;
    image_url?: string;
    supplier_name?: string;
    is_on_sale?: boolean;
    discount_price?: number;
}

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
    onToggleFavorite: (id: string) => void;
    onShowDetails: (product: Product) => void;
    isFavorite: boolean;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onAddToCart, onToggleFavorite, onShowDetails, isFavorite }) => {
    const { formatPrice } = useCurrency();
    const [isImageLoading, setIsImageLoading] = useState(true);

    useEffect(() => {
        setIsImageLoading(true);
    }, [product.image_url]);

    const queryClient = useQueryClient();

    const prefetchProductDetails = () => {
        // Example: Prefetch product details if we had a specific API endpoint for it
        // queryClient.prefetchQuery({
        //     queryKey: ['product', product.id],
        //     queryFn: () => productService.getProduct(product.id),
        //     staleTime: 1000 * 60 * 5, // 5 minutes
        // });
        console.log(`Prefetching details for ${product.name}`);
    };

    const handleAddToCart = () => {
        haptics.medium();
        onAddToCart(product);
    };

    const handleToggleFavorite = () => {
        haptics.light();
        onToggleFavorite(product.id);
    };

    return (
        <Pressable
            onPress={() => onShowDetails(product)}
            onPressIn={prefetchProductDetails}
            className="bg-white rounded-2xl shadow-sm m-2 w-[45%]"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
            <View className="h-40 w-full bg-surface relative overflow-hidden rounded-t-2xl">
                {product.image_url && !product.image_url.startsWith('linear-gradient') ? (
                    <>
                        <Image
                            source={{ uri: product.image_url }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            transition={200}
                            onLoadStart={() => setIsImageLoading(true)}
                            onLoad={() => setIsImageLoading(false)}
                        />
                        {isImageLoading && (
                            <View className="absolute inset-0">
                                <Skeleton width="100%" height="100%" />
                            </View>
                        )}
                    </>
                ) : (
                    <View className="w-full h-full items-center justify-center bg-surface">
                        <Text className="text-xs text-text-secondary">No Image</Text>
                    </View>
                )}

                {/* Sale badge */}
                {product.is_on_sale && (
                    <View className="absolute top-2 left-2 bg-error px-2.5 py-1 rounded-full shadow-sm">
                        <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Sale</Text>
                    </View>
                )}

                {/* Favorite button */}
                <Pressable
                    onPress={handleToggleFavorite}
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm active:bg-white"
                >
                    <Heart
                        size={18}
                        color={isFavorite ? '#ef4444' : '#64748b'}
                        fill={isFavorite ? '#ef4444' : 'transparent'}
                    />
                </Pressable>
            </View>

            <View className="p-3.5">
                <Text className="font-semibold text-sm mb-1 text-text-main leading-tight" numberOfLines={2}>
                    {product.name}
                </Text>

                <Text className="text-xs text-text-secondary mb-3" numberOfLines={1}>
                    {product.supplier_name}
                </Text>

                <View className="flex-row items-end justify-between">
                    <View>
                        {product.is_on_sale && product.discount_price && (
                            <Text className="text-xs line-through text-text-secondary mb-0.5">
                                {formatPrice(product.price)}
                            </Text>
                        )}
                        <Text className="text-primary-600 font-bold text-base">
                            {formatPrice(product.effective_selling_price)}
                        </Text>
                    </View>

                    <Pressable
                        onPress={handleAddToCart}
                        className="p-2.5 bg-primary-50 rounded-xl active:bg-primary-100"
                    >
                        <ShoppingCart size={18} color="#2563eb" />
                    </Pressable>
                </View>
            </View>
        </Pressable>
    );
});

export default ProductCard;
