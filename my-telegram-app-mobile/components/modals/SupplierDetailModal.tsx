/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Modal, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { X, Package, MapPin, Star, Filter } from 'lucide-react-native';
import { cityService } from '../../services/cityService';
import ProductCard from '../ProductCard';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../hooks/useFavorites';

export default function SupplierDetailModal({ show, onClose, supplierId, onProductClick }: any) {
    const [supplier, setSupplier] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Mock telegramUser for favorites
    const telegramUser = { id: 12345 };
    const { isFavorite, toggleFavorite } = useFavorites(telegramUser);
    const { actions: { addToCart } } = useCart();

    useEffect(() => {
        const fetchSupplierDetails = async () => {
            if (!supplierId || !show) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await cityService.getSupplierDetails(supplierId);
                setSupplier(data);
                setCategoryFilter('all');
            } catch (err: any) {
                console.error("Failed to fetch supplier details:", err);
                setError(err.message || "فشل في تحميل تفاصيل المورد");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupplierDetails();
    }, [supplierId, show]);

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [categoryFilter]);

    const filteredProducts = React.useMemo(() => {
        if (!supplier?.products) return [];
        if (categoryFilter === 'all') return supplier.products;
        return supplier.products.filter((p: any) => p.category === categoryFilter);
    }, [supplier?.products, categoryFilter]);

    if (!show) return null;

    return (
        <Modal
            visible={show}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-surface">
                <View className="relative flex-1">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-5 border-b border-border bg-white z-10">
                        <Text className="text-xl font-bold text-text-main flex-1 text-right">
                            {isLoading ? "جاري التحميل..." : supplier ? supplier.name : "تفاصيل المورد"}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="p-2 rounded-full bg-surface border border-border ml-4"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {isLoading ? (
                        <View className="flex-1">
                            <Skeleton width="100%" height={224} borderRadius={0} />
                            <View className="px-5 -mt-10 mb-6">
                                <View className="bg-white rounded-2xl p-5 shadow-lg border border-border">
                                    <View className="items-end mb-4">
                                        <Skeleton width={150} height={28} />
                                    </View>
                                    <View className="space-y-3 items-end">
                                        <Skeleton width={100} height={20} />
                                        <Skeleton width={120} height={20} />
                                        <Skeleton width={80} height={20} />
                                    </View>
                                </View>
                            </View>
                            <View className="px-5 flex-row flex-wrap justify-between">
                                {[1, 2, 3, 4].map(i => (
                                    <View key={i} className="w-[48%] mb-4">
                                        <Skeleton width="100%" height={200} borderRadius={16} />
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : error ? (
                        <View className="flex-1 justify-center items-center p-6">
                            <View className="bg-red-50 border border-red-100 rounded-2xl p-6 w-full items-center">
                                <Package size={48} color="#ef4444" className="mb-4" />
                                <Text className="text-red-600 font-bold text-lg mb-2">خطأ!</Text>
                                <Text className="text-text-secondary text-center mb-4">{error}</Text>
                                <TouchableOpacity
                                    onPress={() => setSupplier(null)}
                                    className="bg-red-500 px-6 py-2.5 rounded-xl shadow-sm"
                                >
                                    <Text className="text-white font-bold">إغلاق</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : supplier ? (

                        <FlashList
                            data={filteredProducts}
                            numColumns={2}
                            // @ts-ignore
                            estimatedItemSize={280}
                            keyExtractor={(item: any) => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            ListHeaderComponent={
                                <>
                                    {/* Supplier Header Image */}
                                    <View className="h-56 bg-primary-600 justify-center items-center relative mb-4">
                                        {supplier.image_url ? (
                                            <Image
                                                source={{ uri: supplier.image_url }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="items-center">
                                                <Package size={64} color="white" className="opacity-80 mb-2" />
                                                <Text className="text-white text-2xl font-bold">{supplier.name}</Text>
                                            </View>
                                        )}
                                        <View className="absolute inset-0 bg-black/20" />
                                    </View>

                                    {/* Supplier Info */}
                                    <View className="px-5 mb-6 -mt-10">
                                        <View className="bg-white rounded-2xl p-5 shadow-lg border border-border">
                                            <Text className="text-2xl font-bold text-text-main mb-4 text-right">{supplier.name}</Text>

                                            <View className="space-y-3">
                                                {supplier.category && (
                                                    <View className="flex-row justify-end items-center gap-3">
                                                        <Text className="font-medium text-text-main">{supplier.category}</Text>
                                                        <Text className="text-text-secondary">:الفئة</Text>
                                                        <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center">
                                                            <Package size={16} color="#3b82f6" />
                                                        </View>
                                                    </View>
                                                )}
                                                {supplier.location && (
                                                    <View className="flex-row justify-end items-center gap-3">
                                                        <Text className="font-medium text-text-main">{supplier.location}</Text>
                                                        <Text className="text-text-secondary">:الموقع</Text>
                                                        <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center">
                                                            <MapPin size={16} color="#10b981" />
                                                        </View>
                                                    </View>
                                                )}
                                                {supplier.rating && (
                                                    <View className="flex-row justify-end items-center gap-3">
                                                        <Text className="font-medium text-text-main">{supplier.rating}/5</Text>
                                                        <Text className="text-text-secondary">:التقييم</Text>
                                                        <View className="w-8 h-8 rounded-full bg-yellow-50 items-center justify-center">
                                                            <Star size={16} color="#f59e0b" fill="#f59e0b" />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {supplier.description && (
                                                <View className="mt-5 pt-5 border-t border-border">
                                                    <Text className="font-bold text-text-main mb-2 text-right">نبذة عن المورد:</Text>
                                                    <Text className="text-text-secondary leading-relaxed text-right">{supplier.description}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Products Header */}
                                    <View className="px-5 mb-4">
                                        <View className="flex-row justify-end items-center">
                                            <Text className="text-lg font-bold text-text-main mr-2">منتجات من هذا المورد</Text>
                                            <Package size={20} color="#3b82f6" />
                                        </View>
                                    </View>
                                </>
                            }
                            renderItem={({ item }: { item: any }) => (
                                <View className="w-full px-2 mb-4">
                                    <ProductCard
                                        product={item}
                                        onShowDetails={() => {
                                            onClose();
                                            if (onProductClick) onProductClick(item.id);
                                        }}
                                        onAddToCart={addToCart}
                                        onToggleFavorite={toggleFavorite}
                                        isFavorite={isFavorite(item.id)}
                                    />
                                </View>
                            )}
                            ListEmptyComponent={
                                <View className="py-12 items-center">
                                    <View className="w-16 h-16 bg-surface rounded-full items-center justify-center mb-4 border border-border">
                                        <Package size={32} color="#94a3b8" />
                                    </View>
                                    <Text className="text-text-secondary font-medium">لا توجد منتجات متاحة</Text>
                                </View>
                            }
                        />
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}
