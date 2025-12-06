import React from 'react';
import { View, TouchableOpacity, Animated, Image, ScrollView } from 'react-native';
import Text from '@/components/ThemedText';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { ShoppingBag, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function MiniCart() {
    const { getCartTotal, getCartItemCount, cartItems } = useCart();
    const { formatPrice } = useCurrency();
    const router = useRouter();
    const itemCount = getCartItemCount();
    const total = getCartTotal();

    const [isExpanded, setIsExpanded] = React.useState(false);
    const expandAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.spring(expandAnim, {
            toValue: isExpanded ? 1 : 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 90,
        }).start();
    }, [isExpanded]);

    if (itemCount === 0) return null;

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <View className="absolute bottom-20 left-4 right-4 z-50">
            {/* Expandable List */}
            <Animated.View
                style={{
                    opacity: expandAnim,
                    transform: [
                        {
                            translateY: expandAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                            })
                        },
                        {
                            scale: expandAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1]
                            })
                        }
                    ],
                    maxHeight: 400,
                    marginBottom: 10,
                    display: isExpanded ? 'flex' : 'none' // Hide when collapsed to prevent touches
                }}
                className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-border"
            >
                <View className="p-4 border-b border-border bg-gray-50/50 flex-row justify-between items-center">
                    <Text className="font-bold text-text-main">محتويات السلة ({itemCount})</Text>
                    <TouchableOpacity onPress={toggleExpand} className="p-1">
                        <ChevronDown size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="max-h-64" showsVerticalScrollIndicator={true}>
                    {cartItems.map((item: any) => (
                        <View key={item.product_id} className="flex-row items-center p-3 border-b border-border last:border-0">
                            <Image
                                source={{ uri: item.image_url }}
                                className="w-12 h-12 rounded-lg bg-gray-100"
                            />
                            <View className="flex-1 mx-3 items-end">
                                <Text className="text-sm font-bold text-text-main text-right" numberOfLines={1}>{item.name}</Text>
                                <Text className="text-xs text-text-secondary text-right">{formatPrice(item.effective_selling_price)}</Text>
                            </View>
                            <View className="bg-primary-50 px-2 py-1 rounded-md border border-primary-100">
                                <Text className="text-primary-700 font-bold text-xs">x{item.quantity}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Main Bar */}
            <TouchableOpacity
                onPress={() => router.push('/cart')}
                activeOpacity={0.9}
                className="bg-blue-600 rounded-full p-4 shadow-xl flex-row items-center justify-between"
            >
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={toggleExpand}
                        className="bg-white/20 p-2 rounded-lg mr-3 relative active:bg-white/30"
                    >
                        {isExpanded ? (
                            <ChevronDown size={24} color="white" />
                        ) : (
                            <ChevronUp size={24} color="white" />
                        )}
                        {!isExpanded && (
                            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border border-blue-600">
                                <Text className="text-white text-xs font-bold">{itemCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xs font-medium opacity-90">المجموع</Text>
                        <Text className="text-white text-lg font-bold">{formatPrice(total)}</Text>
                    </View>
                </View>

                <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-lg">
                    <Text className="text-white font-medium mr-2">إتمام الطلب</Text>
                    <ArrowRight size={16} color="white" />
                </View>
            </TouchableOpacity>
        </View>
    );
}
