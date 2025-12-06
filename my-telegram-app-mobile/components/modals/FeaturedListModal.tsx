import React, { useState, useEffect, useCallback } from 'react';
import { View, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import Text from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { X, Package, Zap } from 'lucide-react-native';
import { useModal } from '@/context/ModalContext';
import { useCurrency } from '@/context/CurrencyContext';
import { apiClient } from '../../api/apiClient';

interface FeaturedListModalProps {
    show: boolean;
    onClose: () => void;
    list: {
        id: string;
        title: string;
        description?: string;
        imageUrl?: string;
    };
}

export default function FeaturedListModal({ show, onClose, list }: FeaturedListModalProps) {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openModal } = useModal();
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (show && list?.id) {
            fetchListItems();
        } else if (!show) {
            // Clear state when closed
            setItems([]);
            setIsLoading(true);
            setError(null);
        }
    }, [show, list?.id]);

    const fetchListItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient(`featured-items/list/${list.id}`);
            setItems(data || []);
        } catch (err: any) {
            console.error("Error fetching list items:", err);
            setError(err.message || "فشل في تحميل عناصر القائمة");
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemClick = useCallback((item: any) => {
        // Close this modal first
        onClose();

        // Small delay to allow close animation to start/finish before opening next modal
        setTimeout(() => {
            if (item.type === "product") {
                openModal("productDetail", {
                    product: {
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        imageUrl: item.imageUrl,
                        price: item.price,
                        // Add other necessary fields if available
                    },
                });
            } else if (item.type === "deal") {
                openModal("dealDetail", {
                    dealId: item.id,
                });
            }
        }, 300);
    }, [onClose, openModal]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => handleItemClick(item)}
            className="flex-row items-start p-4 mb-4 bg-white rounded-2xl shadow-sm border border-border active:scale-[0.99]"
        >
            {/* Text Content (Right side for RTL) */}
            <View className="flex-1 mr-4 items-end">
                <View className="flex-row justify-between items-center w-full mb-2">
                    <Text className="text-lg font-bold text-primary-600">
                        {formatPrice(item.price)}
                    </Text>
                    <Text className="text-base font-bold text-text-main text-right flex-1 ml-3" numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>

                <Text className="text-text-secondary text-sm text-right mb-3 leading-5" numberOfLines={2}>
                    {item.description || "لا يوجد وصف متوفر"}
                </Text>

                <View className="flex-row items-center bg-surface px-3 py-1.5 rounded-lg border border-border self-end">
                    <Text className="text-xs font-medium text-text-secondary mr-2">
                        {item.type === "product" ? "منتج" : "عرض خاص"}
                    </Text>
                    {item.type === "product" ? (
                        <Package size={14} color="#3b82f6" />
                    ) : (
                        <Zap size={14} color="#f59e0b" />
                    )}
                </View>
            </View>

            {/* Image (Left side) */}
            <View className="w-24 h-24 bg-surface rounded-xl overflow-hidden border border-border">
                <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                />
            </View>
        </TouchableOpacity>
    ), [formatPrice, handleItemClick]);

    if (!show) return null;

    return (
        <Modal
            visible={show}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View className="flex-1 bg-surface">
                {/* Header Image & Info */}
                <View className="relative w-full h-64">
                    {list.imageUrl?.startsWith('http') ? (
                        <Image
                            source={{ uri: list.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View className="w-full h-full bg-primary-600" />
                    )}
                    <View className="absolute inset-0 bg-black/40" />

                    <TouchableOpacity
                        onPress={onClose}
                        className="absolute top-4 right-4 bg-black/30 p-2 rounded-full backdrop-blur-sm z-10"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>

                    <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                        <Text className="text-white text-3xl font-bold text-right shadow-md">
                            {list.title}
                        </Text>
                        {list.description && (
                            <Text className="text-white/90 text-base mt-2 text-right shadow-sm font-medium">
                                {list.description}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Content */}
                <View className="flex-1 bg-surface -mt-6 rounded-t-3xl overflow-hidden">
                    {isLoading ? (
                        <View className="flex-1 p-5">
                            {[1, 2, 3, 4].map((i) => (
                                <View key={i} className="flex-row items-start p-4 mb-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <View className="flex-1 mr-4 items-end">
                                        <View className="flex-row justify-between items-center w-full mb-2">
                                            <Skeleton width={60} height={20} />
                                            <Skeleton width={120} height={20} />
                                        </View>
                                        <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
                                        <Skeleton width="80%" height={16} style={{ marginBottom: 12 }} />
                                        <Skeleton width={70} height={24} borderRadius={8} />
                                    </View>
                                    <Skeleton width={96} height={96} borderRadius={12} />
                                </View>
                            ))}
                        </View>
                    ) : error ? (
                        <View className="flex-1 justify-center items-center p-6">
                            <Text className="text-red-500 text-center mb-4 font-medium">{error}</Text>
                            <TouchableOpacity
                                onPress={fetchListItems}
                                className="bg-primary-600 px-6 py-2.5 rounded-xl shadow-sm"
                            >
                                <Text className="text-white font-bold">إعادة المحاولة</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="flex-1 p-5">
                            <FlashList
                                data={items}
                                renderItem={renderItem}
                                // @ts-ignore
                                estimatedItemSize={150}
                                keyExtractor={(item: any) => `${item.type}-${item.id}`}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListEmptyComponent={
                                    <View className="flex-1 justify-center items-center p-8 mt-10">
                                        <View className="w-16 h-16 bg-surface rounded-full items-center justify-center mb-4 border border-border">
                                            <Package size={32} color="#94a3b8" />
                                        </View>
                                        <Text className="text-text-secondary text-center font-medium">لا يوجد عناصر في هذه القائمة.</Text>
                                    </View>
                                }
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
