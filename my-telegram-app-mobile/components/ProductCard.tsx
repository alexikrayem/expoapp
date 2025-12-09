/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/ThemedText';
import { ShoppingCart, Heart } from 'lucide-react-native';
import { useCurrency } from '../context/CurrencyContext';
import { Link } from 'expo-router';
import { Skeleton } from './ui/Skeleton';
import { haptics } from '@/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 6;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN * 2) / 2; // 32 = container padding (16 each side)

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
        <View style={styles.cardContainer}>
            <Pressable
                onPress={() => onShowDetails(product)}
                onPressIn={prefetchProductDetails}
                style={styles.card}
            >
                {({ pressed }) => (
                    <View style={[styles.cardInner, pressed && styles.cardPressed]}>
                        <View style={styles.imageContainer}>
                            {product.image_url && !product.image_url.startsWith('linear-gradient') ? (
                                <>
                                    <Image
                                        source={{ uri: product.image_url }}
                                        style={styles.image}
                                        contentFit="cover"
                                        transition={200}
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoad={() => setIsImageLoading(false)}
                                    />
                                    {isImageLoading && (
                                        <View style={styles.skeletonOverlay}>
                                            <Skeleton width="100%" height="100%" />
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={styles.noImageContainer}>
                                    <Text className="text-xs text-text-secondary">No Image</Text>
                                </View>
                            )}

                            {/* Sale badge */}
                            {product.is_on_sale && (
                                <View style={styles.saleBadge}>
                                    <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Sale</Text>
                                </View>
                            )}

                            {/* Favorite button */}
                            <Pressable
                                onPress={handleToggleFavorite}
                                style={styles.favoriteButton}
                            >
                                <Heart
                                    size={18}
                                    color={isFavorite ? '#ef4444' : '#64748b'}
                                    fill={isFavorite ? '#ef4444' : 'transparent'}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.contentContainer}>
                            <Text className="font-semibold text-sm mb-1 text-text-main leading-tight" numberOfLines={2}>
                                {product.name}
                            </Text>

                            <Text className="text-xs text-text-secondary mb-3" numberOfLines={1}>
                                {product.supplier_name}
                            </Text>

                            <View style={styles.priceRow}>
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
                                    style={styles.addToCartButton}
                                >
                                    <ShoppingCart size={18} color="#2563eb" />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        margin: CARD_MARGIN,
    },
    card: {
        flex: 1,
    },
    cardInner: {
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    imageContainer: {
        height: 150,
        width: '100%',
        backgroundColor: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    skeletonOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    noImageContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    saleBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
    },
    contentContainer: {
        padding: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    addToCartButton: {
        padding: 10,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
    },
});

export default ProductCard;

