/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Image, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { X, Tag, Clock, Package, MapPin, Percent, Gift, ShoppingCart, ExternalLink } from 'lucide-react-native';
import { cityService } from '../../services/cityService';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';

export default function DealDetailModal({ show, onClose, dealId, onProductClick, onSupplierClick }: any) {
    const [deal, setDeal] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { formatPrice } = useCurrency();
    const { actions: { addToCart } } = useCart();

    useEffect(() => {
        const fetchDealDetails = async () => {
            if (!dealId || !show) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await cityService.getDealDetails(dealId);
                setDeal(data);
            } catch (err: any) {
                console.error("Failed to fetch deal details:", err);
                setError(err.message || "فشل في تحميل تفاصيل العرض");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDealDetails();
    }, [dealId, show]);

    const handleProductClick = () => {
        if (deal?.product_id && onProductClick) {
            onClose();
            onProductClick(deal.product_id);
        }
    };

    const handleSupplierClick = () => {
        if (deal?.supplier_id && onSupplierClick) {
            onClose();
            onSupplierClick(deal.supplier_id);
        }
    };

    const handleAddToCart = () => {
        if (deal) {
            const product = {
                id: deal.product_id,
                name: deal.product_name,
                image_url: deal.product_image_url,
                supplier_name: deal.supplier_name,
                effective_selling_price: deal.discount_percentage
                    ? deal.product_price * (1 - deal.discount_percentage / 100)
                    : deal.product_price,
                // Add other necessary fields if needed by CartContext
            };
            addToCart(product);
            onClose();
        }
    };

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
                            {isLoading ? "جاري التحميل..." : deal ? deal.title : "تفاصيل العرض"}
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
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {isLoading && (
                            <View className="p-5 space-y-6 pb-10">
                                {/* Deal Image Skeleton */}
                                <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border">
                                    <Skeleton width="100%" height={224} borderRadius={0} />
                                </View>

                                {/* Deal Info Skeleton */}
                                <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                                    <View className="items-end mb-4">
                                        <Skeleton width={200} height={32} />
                                    </View>
                                    <View className="items-end mb-4">
                                        <Skeleton width={120} height={36} borderRadius={12} />
                                    </View>
                                    <View className="bg-surface rounded-xl p-4 mb-4 border border-border w-full">
                                        <View className="items-end mb-2">
                                            <Skeleton width={100} height={20} />
                                        </View>
                                        <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
                                        <Skeleton width="80%" height={16} />
                                    </View>
                                    <View className="flex-row justify-between gap-3">
                                        <View className="flex-1">
                                            <Skeleton width="100%" height={60} borderRadius={12} />
                                        </View>
                                        <View className="flex-1">
                                            <Skeleton width="100%" height={60} borderRadius={12} />
                                        </View>
                                    </View>
                                </View>

                                {/* Supplier Skeleton */}
                                <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                                    <View className="flex-row justify-between items-center">
                                        <Skeleton width={80} height={20} />
                                        <View className="items-end">
                                            <Skeleton width={120} height={24} style={{ marginBottom: 4 }} />
                                            <Skeleton width={100} height={16} />
                                        </View>
                                    </View>
                                </View>

                                {/* Action Button Skeleton */}
                                <Skeleton width="100%" height={150} borderRadius={16} />
                            </View>
                        )}

                        {error && (
                            <View className="p-6 items-center">
                                <View className="bg-red-50 border border-red-100 rounded-2xl p-6 w-full items-center">
                                    <Tag size={48} color="#ef4444" className="mb-4" />
                                    <Text className="text-red-600 font-bold text-lg mb-2">خطأ!</Text>
                                    <Text className="text-text-secondary text-center mb-4">{error}</Text>
                                    <TouchableOpacity
                                        onPress={() => setDeal(null)}
                                        className="bg-red-500 px-6 py-2.5 rounded-xl shadow-sm"
                                    >
                                        <Text className="text-white font-bold">إغلاق</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {!isLoading && !error && deal && (
                            <View className="p-5 space-y-6 pb-10">
                                {/* Deal Image */}
                                <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border">
                                    <View className="h-56 bg-primary-50 justify-center items-center relative">
                                        {deal.image_url ? (
                                            <Image
                                                source={{ uri: deal.image_url }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="items-center bg-gradient-to-br from-primary-400 to-primary-600 w-full h-full justify-center">
                                                <Gift size={64} color="white" className="opacity-90 mb-2" />
                                                <Text className="text-white text-3xl font-bold">
                                                    {deal.discount_percentage ? `خصم ${deal.discount_percentage}%` : "عرض خاص"}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Deal Info */}
                                <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                                    <Text className="text-2xl font-bold text-text-main text-right mb-4">{deal.title}</Text>

                                    {deal.discount_percentage && (
                                        <View className="flex-row items-center justify-end bg-red-50 border border-red-100 rounded-xl p-3 mb-4 self-end">
                                            <Text className="text-red-600 font-bold text-lg mr-2">خصم {deal.discount_percentage}%</Text>
                                            <Percent size={20} color="#ef4444" />
                                        </View>
                                    )}

                                    {deal.description && (
                                        <View className="bg-surface rounded-xl p-4 mb-4 border border-border">
                                            <Text className="font-bold text-text-main mb-2 text-right">تفاصيل العرض:</Text>
                                            <Text className="text-text-secondary leading-6 text-right">{deal.description}</Text>
                                        </View>
                                    )}

                                    {/* Dates */}
                                    <View className="flex-row justify-between gap-3">
                                        {deal.start_date && (
                                            <View className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3 items-end">
                                                <View className="flex-row items-center mb-1">
                                                    <Text className="text-green-700 text-xs font-bold mr-1">يبدأ في:</Text>
                                                    <Clock size={14} color="#15803d" />
                                                </View>
                                                <Text className="font-bold text-green-800 text-xs">
                                                    {new Date(deal.start_date).toLocaleDateString("ar-EG")}
                                                </Text>
                                            </View>
                                        )}
                                        {deal.end_date && (
                                            <View className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-3 items-end">
                                                <View className="flex-row items-center mb-1">
                                                    <Text className="text-orange-700 text-xs font-bold mr-1">ينتهي في:</Text>
                                                    <Clock size={14} color="#c2410c" />
                                                </View>
                                                <Text className="font-bold text-orange-800 text-xs">
                                                    {new Date(deal.end_date).toLocaleDateString("ar-EG")}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Supplier Info */}
                                {deal.supplier_name && (
                                    <TouchableOpacity
                                        onPress={handleSupplierClick}
                                        className="bg-white rounded-2xl p-5 shadow-sm border border-border active:bg-primary-50"
                                    >
                                        <View className="flex-row justify-end items-center mb-3">
                                            <Text className="font-bold text-text-main mr-2">المورد</Text>
                                            <Package size={18} color="#3b82f6" />
                                        </View>
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-primary-600 text-sm font-bold">عرض المتجر ←</Text>
                                            <View>
                                                <Text className="font-bold text-text-main text-right">{deal.supplier_name}</Text>
                                                {deal.supplier_location && (
                                                    <View className="flex-row items-center justify-end mt-1">
                                                        <Text className="text-sm text-text-secondary mr-1">{deal.supplier_location}</Text>
                                                        <MapPin size={14} color="#64748b" />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* Related Product */}
                                {deal.product_id && deal.product_name && (
                                    <View className="bg-white rounded-2xl p-5 shadow-sm border border-border">
                                        <View className="flex-row justify-end items-center mb-3">
                                            <Text className="font-bold text-text-main mr-2">المنتج المرتبط بالعرض</Text>
                                            <Package size={18} color="#10b981" />
                                        </View>

                                        <TouchableOpacity
                                            onPress={handleProductClick}
                                            className="flex-row items-center justify-between p-3 bg-surface rounded-xl border border-border active:bg-primary-50"
                                        >
                                            <Text className="text-primary-600 text-sm font-bold">عرض المنتج ←</Text>
                                            <View className="flex-row items-center flex-1 justify-end ml-3">
                                                <View className="items-end mr-3 flex-1">
                                                    <Text className="font-bold text-text-main text-right" numberOfLines={1}>{deal.product_name}</Text>
                                                    {deal.product_price && (
                                                        <View className="flex-row items-center mt-1 justify-end">
                                                            {deal.discount_percentage ? (
                                                                <>
                                                                    <Text className="text-xs font-bold text-green-600">
                                                                        {formatPrice(deal.product_price * (1 - deal.discount_percentage / 100))}
                                                                    </Text>
                                                                    <Text className="text-xs text-text-secondary line-through ml-2">
                                                                        {formatPrice(deal.product_price)}
                                                                    </Text>
                                                                </>
                                                            ) : (
                                                                <Text className="text-xs font-bold text-primary-600">
                                                                    {formatPrice(deal.product_price)}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    )}
                                                </View>
                                                {deal.product_image_url ? (
                                                    <Image
                                                        source={{ uri: deal.product_image_url }}
                                                        className="w-12 h-12 rounded-lg bg-surface border border-border"
                                                    />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-lg bg-surface border border-border items-center justify-center">
                                                        <Package size={20} color="#94a3b8" />
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Call to Action */}
                                <View className="bg-primary-600 rounded-2xl p-6 items-center shadow-lg shadow-primary-500/30">
                                    <Gift size={48} color="white" className="opacity-90 mb-4" />
                                    <Text className="text-xl font-bold text-white mb-2">لا تفوت هذا العرض!</Text>
                                    <Text className="text-white/90 mb-6 text-center font-medium">
                                        {deal.end_date
                                            ? `العرض ساري حتى ${new Date(deal.end_date).toLocaleDateString("ar-EG")}`
                                            : "عرض محدود لفترة قصيرة"}
                                    </Text>

                                    <View className="w-full space-y-3">
                                        {deal.product_id && (
                                            <TouchableOpacity
                                                onPress={handleAddToCart}
                                                className="w-full bg-white py-4 px-4 rounded-xl flex-row justify-center items-center shadow-md active:scale-[0.98]"
                                            >
                                                <ShoppingCart size={20} color="#2563eb" className="mr-2" />
                                                <Text className="text-primary-600 font-bold text-lg">استفد من العرض</Text>
                                            </TouchableOpacity>
                                        )}

                                        <View className="flex-row gap-3">
                                            <TouchableOpacity
                                                onPress={handleSupplierClick}
                                                className="flex-1 bg-primary-700/50 py-3 px-4 rounded-xl border border-primary-500 active:bg-primary-700"
                                            >
                                                <Text className="text-white font-bold text-center">زيارة المتجر</Text>
                                            </TouchableOpacity>
                                            {deal.product_id && (
                                                <TouchableOpacity
                                                    onPress={handleProductClick}
                                                    className="flex-1 bg-primary-700/50 py-3 px-4 rounded-xl border border-primary-500 active:bg-primary-700"
                                                >
                                                    <Text className="text-white font-bold text-center">عرض المنتج</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
