import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/ThemedText';
import { Tag, Clock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DealCardProps {
    deal: any;
    onShowDetails: (dealId: string) => void;
}

const DealCard = React.memo(({ deal, onShowDetails }: DealCardProps) => {
    return (
        <TouchableOpacity
            className="bg-white rounded-3xl shadow-md mb-6 overflow-hidden border border-gray-100"
            onPress={() => onShowDetails(deal.id)}
            activeOpacity={0.9}
        >
            <View className="relative">
                {deal.imageUrl?.startsWith('http') ? (
                    <Image
                        source={{ uri: deal.imageUrl }}
                        style={{ width: '100%', height: 192 }} // h-48 is 192px
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View className="w-full h-48 bg-primary-600" />
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Discount Badge */}
                <View className="absolute top-4 right-4 bg-red-500 px-3 py-1.5 rounded-full shadow-lg flex-row items-center">
                    <Tag size={14} color="white" strokeWidth={2.5} />
                    <Text className="text-white font-bold text-xs ml-1.5">{deal.discountPercentage}% خصم</Text>
                </View>

                {/* Time Badge */}
                <View className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex-row items-center border border-white/20">
                    <Clock size={12} color="white" />
                    <Text className="text-white text-xs font-medium ml-1.5">ينتهي خلال {deal.daysRemaining} أيام</Text>
                </View>
            </View>

            <View className="p-5">
                <Text className="text-xl font-bold text-text-main mb-2 text-right leading-tight">{deal.title}</Text>
                <Text className="text-text-secondary text-sm mb-4 leading-6 text-right" numberOfLines={2}>
                    {deal.description}
                </Text>

                <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
                    <View className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-full">
                        <Text className="text-primary-700 font-bold text-xs">عرض التفاصيل</Text>
                        <ArrowRight size={14} color="#2563EB" style={{ marginLeft: 6 }} />
                    </View>
                    {/* Placeholder for supplier or other info */}
                    <Text className="text-xs text-gray-400 font-medium">عرض خاص</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default DealCard;
