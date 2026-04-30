import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import { Button } from '@/components/ui/Button';
import PressableScale from '@/components/ui/PressableScale';
import { IMAGE_PLACEHOLDER_BLURHASH } from '@/utils/image';

export default function CartScreen() {
    const { cartItems, actions, getCartTotal } = useCart();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    const renderItem = useCallback(({ item }: { item: any }) => (
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex-row items-center border border-border">
            <Image
                source={{ uri: item.image_url }}
                className="w-20 h-20 rounded-xl bg-surface"
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                placeholder={IMAGE_PLACEHOLDER_BLURHASH}
                recyclingKey={`cart-${item.product_id}`}
            />
            <View className="flex-1 ml-4 mr-2">
                <Text className="text-text-main font-bold text-right text-base" numberOfLines={1}>{item.name}</Text>
                <Text className="text-text-secondary text-xs text-right mb-2 font-medium">{item.supplier_name}</Text>
                <Text className="text-primary-600 font-bold text-right text-lg">{formatPrice(item.effective_selling_price)}</Text>
            </View>

            <View className="items-center">
                <View className="flex-row items-center bg-surface rounded-xl mb-2 border border-border">
                    <PressableScale
                        onPress={() => actions.increaseQuantity(item.product_id)}
                        scaleTo={0.92}
                        haptic="light"
                        className="p-2 rounded-l-xl"
                    >
                        <Plus size={16} color="#4B5563" />
                    </PressableScale>
                    <Text className="font-bold w-8 text-center text-text-main">{item.quantity}</Text>
                    <PressableScale
                        onPress={() => actions.decreaseQuantity(item.product_id)}
                        scaleTo={0.92}
                        haptic="light"
                        className="p-2 rounded-r-xl"
                    >
                        <Minus size={16} color="#4B5563" />
                    </PressableScale>
                </View>
                <PressableScale
                    onPress={() => actions.removeItem(item.product_id)}
                    scaleTo={0.92}
                    haptic="medium"
                    className="p-2 bg-red-50 rounded-full"
                >
                    <Trash2 size={18} color="#EF4444" />
                </PressableScale>
            </View>
        </View>
    ), [actions, formatPrice]);

    if (cartItems.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <AnimatedScreen className="justify-center items-center p-4">
                    <ShoppingBag size={64} color="#9CA3AF" />
                    <Text className="text-xl font-bold text-gray-800 mt-4">سلة التسوق فارغة</Text>
                    <Text className="text-gray-500 mt-2 text-center">أضف بعض المنتجات لتبدأ التسوق</Text>
                    <Button
                        title="تصفح المنتجات"
                        onPress={() => router.back()}
                        className="mt-8"
                    />
                </AnimatedScreen>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface">
            <AnimatedScreen>
                <View className="flex-1">
                    <FlashList
                        data={cartItems}
                        keyExtractor={(item: any) => item.product_id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                        estimatedItemSize={120}
                        removeClippedSubviews
                        initialNumToRender={6}
                        maxToRenderPerBatch={8}
                        windowSize={5}
                        renderItem={renderItem}
                    />
                </View>

                <View className="bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-t-3xl border-t border-border">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-primary-600">{formatPrice(getCartTotal())}</Text>
                        <Text className="text-text-secondary font-medium text-lg">المجموع الكلي:</Text>
                    </View>
                    <Button
                        title="متابعة الشراء"
                        onPress={() => router.push('/checkout')}
                        size="lg"
                        className="shadow-lg shadow-primary-500/30"
                        rightIcon={<ArrowRight size={20} color="#ffffff" />}
                    />
                </View>
            </AnimatedScreen>
        </SafeAreaView>
    );
}
