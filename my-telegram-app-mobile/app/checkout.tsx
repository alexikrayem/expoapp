import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCheckout } from '@/context/CheckoutContext';
import { useModal } from '@/context/ModalContext';
import { useCurrency } from '@/context/CurrencyContext';
import { MapPin, CreditCard, CheckCircle, AlertCircle, ChevronRight, Edit3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import CheckoutSlider from '@/components/CheckoutSlider';

export default function CheckoutScreen() {
    const { userProfile, isAuthenticated, isLoading: isLoadingAuth, refreshProfile } = useAuth();
    const { cartItems, getCartTotal } = useCart();
    const { placeOrder, isPlacingOrder, checkoutError } = useCheckout();
    const { openModal } = useModal();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'card'

    useEffect(() => {
        if (!isLoadingAuth && !isAuthenticated) {
            // Redirect to login or show login prompt
            // For now, we assume dev bypass works or user is logged in
        }
    }, [isLoadingAuth, isAuthenticated]);

    const handlePlaceOrder = async () => {
        if (!userProfile) return;

        const addressData = {
            fullName: userProfile.full_name,
            phoneNumber: userProfile.phone_number,
            addressLine1: userProfile.address_line1,
            addressLine2: userProfile.address_line2,
            city: userProfile.city || userProfile.selected_city_name,
        };

        await placeOrder(addressData, refreshProfile);
    };

    const handleEditAddress = () => {
        const initialData = {
            fullName: userProfile?.full_name,
            phoneNumber: userProfile?.phone_number,
            addressLine1: userProfile?.address_line1,
            addressLine2: userProfile?.address_line2,
            city: userProfile?.city || userProfile?.selected_city_name,
        };

        openModal('address', {
            initialData,
            onSaveAndProceed: async (data: any) => {
                // We just want to save the address, not proceed with order immediately from modal
                // But CheckoutContext's handleSaveAddressAndProceed does both.
                // For now, we can use the same flow or just update profile.
                // Let's use the context's flow which updates profile then closes modal.
                // We need to pass a callback that refreshes profile.

                // Actually, we can just call userService.updateProfile directly here if we wanted,
                // but let's stick to the modal flow if possible.
                // The modal expects onSaveAndProceed.

                // Let's rely on the modal closing and us refreshing the profile.
                await refreshProfile();
            },
            availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
        });
    };

    if (isLoadingAuth) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (cartItems.length === 0) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 p-4">
                <Text className="text-xl font-bold text-gray-800">سلة التسوق فارغة</Text>
                <TouchableOpacity onPress={() => router.replace('/')} className="mt-4">
                    <Text className="text-blue-600 font-bold">العودة للتسوق</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const hasAddress = userProfile?.address_line1 && userProfile?.city;

    return (
        <SafeAreaView className="flex-1 bg-surface">
            <AnimatedScreen>
                <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                    <Text className="text-2xl font-bold text-text-main mb-6 text-right">إتمام الطلب</Text>

                    {/* Address Section */}
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-border">
                        <View className="flex-row justify-between items-center mb-4">
                            <TouchableOpacity onPress={handleEditAddress} className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg">
                                <Text className="text-primary-600 text-sm font-semibold mr-1.5">
                                    {hasAddress ? 'تغيير' : 'إضافة عنوان'}
                                </Text>
                                <Edit3 size={14} color="#2563EB" />
                            </TouchableOpacity>
                            <View className="flex-row items-center">
                                <Text className="text-lg font-bold text-text-main mr-2">عنوان التوصيل</Text>
                                <MapPin size={20} color="#64748b" />
                            </View>
                        </View>

                        {hasAddress ? (
                            <View className="items-end">
                                <Text className="text-text-main font-bold text-base mb-1">{userProfile.full_name}</Text>
                                <Text className="text-text-secondary mb-1">{userProfile.phone_number}</Text>
                                <Text className="text-text-secondary text-right leading-relaxed">
                                    {userProfile.address_line1}, {userProfile.city}
                                </Text>
                                {userProfile.address_line2 && (
                                    <Text className="text-text-secondary text-sm mt-1 text-right">{userProfile.address_line2}</Text>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={handleEditAddress}
                                className="bg-surface border-2 border-dashed border-border rounded-xl p-8 items-center justify-center active:bg-gray-50"
                            >
                                <Text className="text-text-secondary font-medium">أضف عنوان التوصيل</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Payment Method */}
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-border">
                        <View className="flex-row justify-end items-center mb-4">
                            <Text className="text-lg font-bold text-text-main mr-2">طريقة الدفع</Text>
                            <CreditCard size={20} color="#64748b" />
                        </View>

                        <TouchableOpacity
                            onPress={() => setPaymentMethod('cod')}
                            className={`flex-row items-center justify-between p-4 rounded-xl border ${paymentMethod === 'cod' ? 'border-primary-500 bg-primary-50' : 'border-border bg-surface'
                                }`}
                        >
                            <View className="flex-row items-center">
                                {paymentMethod === 'cod' && <CheckCircle size={20} color="#2563EB" />}
                            </View>
                            <Text className={`font-medium text-base ${paymentMethod === 'cod' ? 'text-primary-800' : 'text-text-secondary'}`}>
                                الدفع عند الاستلام
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Order Summary */}
                    <View className="bg-white rounded-2xl p-5 mb-24 shadow-sm border border-border">
                        <Text className="text-lg font-bold text-text-main mb-4 text-right">ملخص الطلب</Text>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="font-bold text-text-main">{formatPrice(getCartTotal())}</Text>
                            <Text className="text-text-secondary">المجموع الفرعي</Text>
                        </View>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="font-bold text-success">مجاني</Text>
                            <Text className="text-text-secondary">التوصيل</Text>
                        </View>
                        <View className="h-px bg-border my-4" />
                        <View className="flex-row justify-between items-center">
                            <Text className="text-2xl font-bold text-primary-600">{formatPrice(getCartTotal())}</Text>
                            <Text className="text-lg font-bold text-text-main">الإجمالي</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Action Bar */}
                <View className="absolute bottom-0 left-0 right-0 bg-white p-5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-t-3xl border-t border-border">
                    {checkoutError && (
                        <View className="flex-row items-center justify-end mb-4 bg-error/10 p-3 rounded-xl border border-error/20">
                            <Text className="text-error text-sm mr-2 font-medium">{checkoutError}</Text>
                            <AlertCircle size={16} color="#DC2626" />
                        </View>
                    )}

                    <CheckoutSlider
                        onSlideComplete={handlePlaceOrder}
                        isLoading={isPlacingOrder}
                        enabled={hasAddress}
                        initialText={isPlacingOrder ? "جاري التأكيد..." : "اسحب لتأكيد الطلب"}
                    />

                    {!hasAddress && (
                        <Text className="text-center text-error text-xs mt-3 font-medium">يرجى إضافة عنوان التوصيل للمتابعة</Text>
                    )}
                </View>
            </AnimatedScreen>
        </SafeAreaView>
    );
}
