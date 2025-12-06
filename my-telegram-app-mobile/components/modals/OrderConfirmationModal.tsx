import React, { useEffect } from 'react';
import { View, Modal, TouchableOpacity, Animated } from 'react-native';
import Text from '@/components/ThemedText';
import { CheckCircle, Package, MapPin, Phone, User, ArrowRight } from 'lucide-react-native';
import { useCurrency } from '../../context/CurrencyContext';

interface OrderConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    orderDetails: any;
    customerInfo: any;
}

export default function OrderConfirmationModal({ visible, onClose, orderDetails, customerInfo }: OrderConfirmationModalProps) {
    const { formatPrice } = useCurrency();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-close after 8 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 8000);

            return () => clearTimeout(timer);
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.5);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View className="flex-1 bg-black/60 backdrop-blur-sm justify-center items-center p-5">
                <Animated.View
                    style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
                    className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl overflow-hidden"
                >
                    {/* Success Header */}
                    <View className="items-center mb-8">
                        <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-4 ring-8 ring-green-50">
                            <CheckCircle size={48} color="#16a34a" />
                        </View>
                        <Text className="text-2xl font-bold text-text-main mb-2 text-center">
                            تم استلام طلبك بنجاح! 🎉
                        </Text>
                        <View className="bg-primary-50 px-4 py-2 rounded-full border border-primary-100">
                            <Text className="text-primary-700 font-bold">
                                رقم الطلب: #{orderDetails.orderId}
                            </Text>
                        </View>
                    </View>

                    {/* Order Details Card */}
                    <View className="bg-white rounded-2xl p-4 border border-border mb-6">
                        <View className="flex-row items-center justify-between mb-4 border-b border-border pb-3">
                            <View className="flex-row items-center">
                                <Package size={18} color="#3b82f6" className="mr-2" />
                                <Text className="font-bold text-text-main">ملخص التوصيل</Text>
                            </View>
                        </View>

                        {customerInfo && (
                            <View className="space-y-3">
                                <View className="flex-row items-center justify-end">
                                    <Text className="text-text-main font-medium mr-2">{customerInfo.fullName}</Text>
                                    <User size={16} color="#64748b" />
                                </View>
                                <View className="flex-row items-center justify-end">
                                    <Text className="text-text-main font-medium mr-2">{customerInfo.phoneNumber}</Text>
                                    <Phone size={16} color="#64748b" />
                                </View>
                                <View className="flex-row items-start justify-end">
                                    <View className="items-end mr-2 flex-1">
                                        <Text className="text-text-main text-right font-medium">{customerInfo.addressLine1}</Text>
                                        {customerInfo.addressLine2 ? (
                                            <Text className="text-text-secondary text-xs text-right mt-1">{customerInfo.addressLine2}</Text>
                                        ) : null}
                                        <Text className="text-primary-600 font-bold text-xs text-right mt-1">{customerInfo.city}</Text>
                                    </View>
                                    <MapPin size={16} color="#64748b" className="mt-1" />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        onPress={onClose}
                        className="w-full bg-primary-600 py-4 rounded-xl shadow-lg shadow-primary-500/30 flex-row items-center justify-center active:scale-[0.98]"
                    >
                        <Text className="text-white font-bold text-lg mr-2">متابعة التسوق</Text>
                        <ArrowRight size={20} color="white" />
                    </TouchableOpacity>

                    <Text className="text-center text-text-secondary text-xs mt-4 font-medium">
                        سيتم إرسال تفاصيل الطلب إلى هاتفك 📱
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
}
