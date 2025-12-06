import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Text from '@/components/ThemedText';
import { MapPin, Star } from 'lucide-react-native';

interface SupplierCardProps {
    supplier: any;
    onShowDetails: (supplierId: string) => void;
}

const SupplierCard = React.memo(({ supplier, onShowDetails }: SupplierCardProps) => {
    return (
        <TouchableOpacity
            className="bg-white rounded-xl shadow-sm mb-4 p-4 flex-row items-center border border-gray-100"
            onPress={() => onShowDetails(supplier.id)}
            activeOpacity={0.7}
        >
            {supplier.logoUrl?.startsWith('http') ? (
                <Image
                    source={{ uri: supplier.logoUrl }}
                    style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6' }}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center">
                    <Text className="text-primary-600 font-bold text-xl">{supplier.name?.charAt(0)}</Text>
                </View>
            )}
            <View className="flex-1 ml-4">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-lg font-bold text-gray-800">{supplier.name}</Text>
                    <View className="flex-row items-center bg-yellow-50 px-1.5 py-0.5 rounded">
                        <Star size={12} color="#EAB308" fill="#EAB308" className="mr-1" />
                        <Text className="text-yellow-700 font-bold text-xs">{supplier.rating}</Text>
                    </View>
                </View>
                <Text className="text-gray-500 text-sm mb-2" numberOfLines={1}>{supplier.category}</Text>
                <View className="flex-row items-center">
                    <MapPin size={12} color="#9CA3AF" className="mr-1" />
                    <Text className="text-gray-400 text-xs">{supplier.city}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default SupplierCard;
