/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Image, ScrollView, TouchableOpacity, Modal, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import Text from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { X, ShoppingCart, Heart, Minus, Plus, Share2, Star, Check } from 'lucide-react-native';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useCurrency } from '@/context/CurrencyContext';
import ImageViewer from './ImageViewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/utils/haptics';


export default function ProductDetailModal({ show, onClose, product }: any) {
    const { actions: { addToCart } } = useCart();
    // Mock telegramUser for now
    const telegramUser = { id: 12345 };
    const { isFavorite, toggleFavorite } = useFavorites(telegramUser);
    const { formatPrice } = useCurrency();
    const [quantity, setQuantity] = useState(0);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(true);
    const [fullProduct, setFullProduct] = useState<any>(product);

    // Animation values
    const animationProgress = useSharedValue(0);

    // Animated styles - MUST be defined before any early returns
    const addToCartButtonStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animationProgress.value, [0, 1], [1, 0]),
    }));

    const quantityControlsStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animationProgress.value, [0, 1], [0, 1]),
    }));

    // Animate when quantity changes
    useEffect(() => {
        animationProgress.value = withTiming(quantity > 0 ? 1 : 0, {
            duration: 250,
        });
    }, [quantity]);

    useEffect(() => {
        if (product?.id) {
            setIsLoading(true);
            setFullProduct(product);
            // Simulate fetch or actually fetch if we had an endpoint for "full details"
            // For now, let's simulate a quick load to show off the skeleton as requested
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [product]);


    if (!show) return null;
    // Use fullProduct or product, but fullProduct is updated
    const displayProduct = fullProduct || product;
    if (!displayProduct) return null;

    const handleAddToCart = () => {
        if (quantity > 0) {
            for (let i = 0; i < quantity; i++) {
                addToCart(displayProduct);
            }
            setQuantity(0); // Reset after adding
            onClose();
        }
    };

    return (
        <Modal
            visible={show}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <View
                className="flex-1 bg-white rounded-t-3xl overflow-hidden"
                style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
            >
                <View className="relative flex-1">
                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-sm"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={22} color="#0f172a" />
                    </TouchableOpacity>

                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                    >
                        {isLoading ? (
                            <View>
                                <Skeleton width="100%" height={384} borderRadius={0} />
                                <View className="p-6 -mt-6 bg-white rounded-t-3xl shadow-sm">
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="flex-1 mr-4 items-end">
                                            <Skeleton width={200} height={32} style={{ marginBottom: 8 }} />
                                            <Skeleton width={120} height={20} />
                                        </View>
                                        <View className="items-end">
                                            <Skeleton width={80} height={32} />
                                        </View>
                                    </View>
                                    <View className="flex-row justify-end items-center mb-8 space-x-3">
                                        <Skeleton width={60} height={24} borderRadius={8} />
                                        <Skeleton width={80} height={24} borderRadius={20} />
                                    </View>
                                    <View className="mb-8 items-end">
                                        <Skeleton width={100} height={28} style={{ marginBottom: 12 }} />
                                        <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
                                        <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
                                        <Skeleton width="80%" height={16} />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <>
                                {/* Image */}
                                <TouchableOpacity onPress={() => setImageViewerVisible(true)} activeOpacity={0.95}>
                                    <Image
                                        source={{ uri: displayProduct.image_url }}
                                        className="w-full h-96 bg-surface"
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>

                                <View className="p-6 -mt-6 bg-white rounded-t-3xl shadow-sm">
                                    {/* Header */}
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="flex-1 mr-4">
                                            <Text className="text-2xl font-bold text-text-main text-right mb-1.5 leading-tight">{displayProduct.name}</Text>
                                            <Text className="text-sm text-primary-600 font-medium text-right">{displayProduct.supplier_name}</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-2xl font-bold text-primary-600">{formatPrice(displayProduct.effective_selling_price)}</Text>
                                            {displayProduct.original_price && (
                                                <Text className="text-sm text-text-secondary line-through mt-0.5">{formatPrice(displayProduct.original_price)}</Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Rating & Category */}
                                    <View className="flex-row justify-end items-center mb-8 space-x-3">
                                        <View className="flex-row items-center bg-yellow-50 px-2.5 py-1 rounded-lg ml-3 border border-yellow-100">
                                            <Star size={14} color="#EAB308" fill="#EAB308" />
                                            <Text className="ml-1.5 font-bold text-yellow-700 text-xs">4.8</Text>
                                        </View>
                                        <View className="bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                                            <Text className="text-primary-700 text-xs font-semibold">{displayProduct.category}</Text>
                                        </View>
                                    </View>

                                    {/* Description */}
                                    <View className="mb-8">
                                        <Text className="text-lg font-bold text-text-main mb-3 text-right">الوصف</Text>
                                        <Text className="text-text-secondary leading-7 text-right text-base">
                                            {displayProduct.description || "لا يوجد وصف متاح لهذا المنتج."}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    {!isLoading && (
                        <View
                            className="absolute left-0 right-0 p-4 bg-white border-t border-gray-200 flex-row gap-4"
                            style={{ bottom: insets.bottom + 8 }} // ⭐ 8px extra space above nav bar
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    haptics.light();
                                    toggleFavorite(displayProduct.id);
                                }}
                                className={`w-14 h-14 rounded-full flex items-center justify-center border ${isFavorite(displayProduct.id)
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-white border-gray-300'
                                    }`}
                                activeOpacity={0.8}
                            >
                                <Heart
                                    size={26}
                                    color={isFavorite(displayProduct.id) ? "#EF4444" : "#64748b"}
                                    fill={isFavorite(displayProduct.id) ? "#EF4444" : "transparent"}
                                />
                            </TouchableOpacity>

                            {/* Morphing Add to Cart / Quantity Button */}
                            <View className="flex-1 h-14 relative">
                                {/* Add to Cart Button (State 1) */}
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        addToCartButtonStyle,
                                        { zIndex: quantity === 0 ? 1 : 0 }
                                    ]}
                                    pointerEvents={quantity === 0 ? 'auto' : 'none'}
                                >
                                    <TouchableOpacity
                                        onPress={() => {
                                            haptics.medium();
                                            setQuantity(1);
                                        }}
                                        className="bg-blue-600 rounded-full flex-row justify-center items-center h-full active:opacity-80"
                                    >
                                        <ShoppingCart size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-bold text-lg">إضافة للسلة</Text>
                                    </TouchableOpacity>
                                </Animated.View>


                                {/* Quantity Controls (State 2) */}
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        quantityControlsStyle,
                                        { zIndex: quantity > 0 ? 1 : 0 }
                                    ]}
                                    pointerEvents={quantity > 0 ? 'auto' : 'none'}
                                >
                                    <View className="flex-row gap-3 h-full">

                                        {/* Quantity Control Bar */}
                                        <View className="flex-1 bg-white rounded-full border border-gray-300 flex-row items-center overflow-hidden">
                                            <TouchableOpacity
                                                onPress={() => {
                                                    haptics.selection();
                                                    setQuantity(Math.max(0, quantity - 1));
                                                }}
                                                className="h-full px-4 justify-center active:opacity-60"
                                            >
                                                <Minus size={18} color="#4b5563" strokeWidth={2.5} />
                                            </TouchableOpacity>

                                            <View className="flex-1 items-center justify-center">
                                                <Text className="text-gray-900 font-bold text-xl">{quantity}</Text>
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => {
                                                    haptics.selection();
                                                    setQuantity(quantity + 1);
                                                }}
                                                className="h-full px-4 justify-center active:opacity-60"
                                            >
                                                <Plus size={18} color="#4b5563" strokeWidth={2.5} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Confirm Button */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                haptics.success();
                                                handleAddToCart();
                                            }}
                                            className="bg-blue-600 px-6 rounded-full flex-row items-center justify-center active:bg-blue-700 h-full"
                                            activeOpacity={0.9}
                                        >
                                            <Check size={20} color="white" style={{ marginLeft: 4 }} />
                                            <Text className="text-white font-bold text-base">تأكيد</Text>
                                        </TouchableOpacity>

                                    </View>
                                </Animated.View>

                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Image Viewer */}
            <ImageViewer
                visible={imageViewerVisible}
                imageUrl={displayProduct?.image_url}
                imageName={displayProduct?.name}
                onClose={() => setImageViewerVisible(false)}
            />
        </Modal>
    );
}
