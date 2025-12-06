import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '@/components/ui/AnimatedScreen';

export default function CartScreen() {
    const { cartItems, actions, getCartTotal } = useCart();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    if (cartItems.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <AnimatedScreen className="justify-center items-center p-4">
                    <ShoppingBag size={64} color="#9CA3AF" />
                    <Text className="text-xl font-bold text-gray-800 mt-4">سلة التسوق فارغة</Text>
                    <Text className="text-gray-500 mt-2 text-center">أضف بعض المنتجات لتبدأ التسوق</Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-8 bg-blue-600 px-8 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">تصفح المنتجات</Text>
                    </TouchableOpacity>
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
                        // @ts-ignore
                        estimatedItemSize={120}
                        renderItem={({ item }: { item: any }) => (
                            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex-row items-center border border-border">
                                <Image
                                    source={{ uri: item.image_url }}
                                    className="w-20 h-20 rounded-xl bg-surface"
                                    resizeMode="cover"
                                />
                                <View className="flex-1 ml-4 mr-2">
                                    <Text className="text-text-main font-bold text-right text-base" numberOfLines={1}>{item.name}</Text>
                                    <Text className="text-text-secondary text-xs text-right mb-2 font-medium">{item.supplier_name}</Text>
                                    <Text className="text-primary-600 font-bold text-right text-lg">{formatPrice(item.effective_selling_price)}</Text>
                                </View>

                                <View className="items-center">
                                    <View className="flex-row items-center bg-surface rounded-xl mb-2 border border-border">
                                        <TouchableOpacity
                                            onPress={() => actions.increaseQuantity(item.product_id)}
                                            className="p-2 active:bg-gray-100 rounded-l-xl"
                                        >
                                            <Plus size={16} color="#4B5563" />
                                        </TouchableOpacity>
                                        <Text className="font-bold w-8 text-center text-text-main">{item.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={() => actions.decreaseQuantity(item.product_id)}
                                            className="p-2 active:bg-gray-100 rounded-r-xl"
                                        >
                                            <Minus size={16} color="#4B5563" />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => actions.removeItem(item.product_id)}
                                        className="p-2 bg-red-50 rounded-full"
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    />
                </View>

                <View className="bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-t-3xl border-t border-border">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-primary-600">{formatPrice(getCartTotal())}</Text>
                        <Text className="text-text-secondary font-medium text-lg">المجموع الكلي:</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/checkout')}
                        className="bg-primary-600 py-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-primary-500/30 active:scale-[0.98]"
                    >
                        <Text className="text-white font-bold text-lg mr-2">متابعة الشراء</Text>
                        <ArrowRight size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </AnimatedScreen>
        </SafeAreaView>
    );
}
