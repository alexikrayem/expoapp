import React from 'react';
import { View, Modal, ScrollView } from 'react-native';
import Text from '@/components/ThemedText';
import { CheckCircle, Edit3, MapPin, User, Phone } from 'lucide-react-native';
import PressableScale from '@/components/ui/PressableScale';

interface AddressConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    profileData: any;
    onConfirmAndProceed: () => void;
    onEditAddress: () => void;
    onCancel: () => void;
}

export default function AddressConfirmationModal({
    visible,
    onClose,
    profileData,
    onConfirmAndProceed,
    onEditAddress,
    onCancel
}: AddressConfirmationModalProps) {
    if (!visible) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/70 p-5 backdrop-blur-sm">
                <View className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                    <View className="items-center mb-6">
                        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4 ring-4 ring-green-50">
                            <CheckCircle size={32} color="#16a34a" />
                        </View>
                        <Text className="text-xl font-bold text-text-main mb-2">تأكيد عنوان التوصيل</Text>
                        <Text className="text-text-secondary text-sm text-center px-4 leading-5">
                            هل تريد استخدام العنوان المحفوظ أم تعديله؟
                        </Text>
                    </View>

                    {/* Address Display */}
                    <View className="bg-surface rounded-2xl p-5 mb-6 space-y-3 border border-border">
                        <View className="flex-row items-center justify-end">
                            <Text className="text-text-main font-bold mr-3 text-base">{profileData.fullName}</Text>
                            <User size={18} color="#64748b" />
                        </View>

                        <View className="flex-row items-center justify-end">
                            <Text className="text-text-main mr-3 font-medium">{profileData.phoneNumber}</Text>
                            <Phone size={18} color="#64748b" />
                        </View>

                        <View className="flex-row items-start justify-end">
                            <View className="items-end mr-3 flex-1">
                                <Text className="text-text-main text-right font-medium">{profileData.addressLine1}</Text>
                                {profileData.addressLine2 ? (
                                    <Text className="text-sm text-text-secondary text-right mt-1">{profileData.addressLine2}</Text>
                                ) : null}
                                <Text className="text-sm font-bold text-primary-600 text-right mt-1">{profileData.city}</Text>
                            </View>
                            <MapPin size={18} color="#64748b" className="mt-1" />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="space-y-3">
                        <PressableScale
                            onPress={onConfirmAndProceed}
                            scaleTo={0.98}
                            className="w-full bg-green-600 py-4 rounded-xl shadow-lg shadow-green-500/20 items-center"
                        >
                            <Text className="text-white font-bold text-lg">تأكيد وإتمام الطلب</Text>
                        </PressableScale>

                        <PressableScale
                            onPress={onEditAddress}
                            scaleTo={0.98}
                            className="w-full bg-surface py-3.5 rounded-xl flex-row items-center justify-center border border-border"
                        >
                            <Edit3 size={18} color="#374151" className="mr-2" />
                            <Text className="text-text-main font-bold">تعديل العنوان</Text>
                        </PressableScale>

                        <PressableScale
                            onPress={onCancel}
                            scaleTo={0.98}
                            className="w-full py-2 items-center mt-1"
                        >
                            <Text className="text-text-secondary text-sm font-medium">إلغاء</Text>
                        </PressableScale>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
