import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Modal, Animated, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';
import { X, MapPin, Check } from 'lucide-react-native';
import { cityService } from '@/services/cityService';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

interface CitySelectionModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CitySelectionModal({ visible, onClose }: CitySelectionModalProps) {
    const { userProfile, refreshProfile } = useAuth();
    const [cities, setCities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // Animation state
    const slideAnim = React.useRef(new Animated.Value(600)).current; // Start off-screen
    const [showModal, setShowModal] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            fetchCities();
            // Slide up
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 90,
            }).start();
        } else {
            // Slide down
            Animated.timing(slideAnim, {
                toValue: 600, // Slide back down
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                setShowModal(false);
            });
        }
    }, [visible]);

    const fetchCities = async () => {
        try {
            const data = await cityService.getCities();
            setCities(data || []);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCity = async (city: any) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await userService.updateProfile({ selected_city_id: city.id });
            await refreshProfile();
            onClose();
        } catch (error) {
            console.error('Failed to update city:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!showModal) return null;

    return (
        <Modal
            visible={showModal}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <View className="flex-1 justify-end bg-black/60 backdrop-blur-sm">
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={{ transform: [{ translateY: slideAnim }] }}
                    className="bg-surface rounded-t-3xl h-[75%] overflow-hidden"
                >
                    <View
                        className="p-5 border-b border-border bg-white flex-row justify-between items-center"
                        style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.06,
                            shadowRadius: 3,
                            elevation: 2,
                        }}
                    >
                        <TouchableOpacity
                            onPress={onClose}
                            className="p-2 rounded-full bg-surface border border-border ml-4"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-text-main">اختر المدينة</Text>
                        <View className="w-10" />
                    </View>

                    {isLoading ? (
                        <View className="p-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <View key={i} className="flex-row items-center justify-between p-4 mb-3 rounded-2xl border border-gray-100 bg-white">
                                    <Skeleton width={100} height={20} />
                                    <Skeleton width={30} height={30} borderRadius={10} />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <FlashList
                            data={cities}
                            keyExtractor={(item: any) => item.id.toString()}
                            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                            // @ts-ignore
                            estimatedItemSize={80}
                            renderItem={({ item }: { item: any }) => {
                                const isSelected = userProfile?.selected_city_id === item.id;
                                return (
                                    <TouchableOpacity
                                        onPress={() => handleSelectCity(item)}
                                        disabled={isUpdating}
                                        className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border active:scale-[0.99] ${isSelected
                                            ? 'bg-primary-50 border-primary-200'
                                            : 'bg-white border-border'
                                            }`}
                                    >
                                        {isSelected && <Check size={20} color="#2563EB" />}
                                        <View className="flex-1 items-end">
                                            <Text className={`font-bold text-base ${isSelected ? 'text-primary-800' : 'text-text-main'}`}>
                                                {item.name_ar || item.name}
                                            </Text>
                                        </View>
                                        <View className={`p-2.5 rounded-xl ml-3 ${isSelected ? 'bg-primary-100' : 'bg-surface border border-border'}`}>
                                            <MapPin size={20} color={isSelected ? '#2563EB' : '#94a3b8'} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}
