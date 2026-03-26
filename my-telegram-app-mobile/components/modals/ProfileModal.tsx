import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, KeyboardAvoidingView, Platform, Image, I18nManager } from 'react-native';
import Text from '@/components/ThemedText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { X, User, Phone, Home, MapPin, Mail, Save } from 'lucide-react-native';
import PressableScale from '@/components/ui/PressableScale';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    telegramUser: any;
    userProfile: any;
    onSave: (data: any) => Promise<void>;
}

export default function ProfileModal({ visible, onClose, telegramUser, userProfile, onSave }: ProfileModalProps) {
    const isRTL = I18nManager.isRTL;
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phoneNumber: userProfile.phoneNumber || '',
                addressLine1: userProfile.addressLine1 || '',
                addressLine2: userProfile.addressLine2 || '',
                city: userProfile.city || '',
            });
        }
    }, [visible, userProfile]);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setError(null);
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const iconSlot = (icon: React.ReactNode) => (isRTL ? { rightIcon: icon } : { leftIcon: icon });

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-end"
            >
                <View className="flex-1 bg-black/60 backdrop-blur-sm" onTouchEnd={onClose} />
                <View className="bg-surface rounded-t-3xl h-[85%] w-full absolute bottom-0 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-5 border-b border-border bg-white z-10">
                        <Text className="text-xl font-bold text-text-main">الملف الشخصي</Text>
                        <PressableScale onPress={onClose} scaleTo={0.9} haptic="selection" className="p-2 bg-surface rounded-full border border-border">
                            <X size={20} color="#64748b" />
                        </PressableScale>
                    </View>

                    <ScrollView
                        className="flex-1 p-5"
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Avatar Section */}
                        <View className="items-center mb-8 mt-2">
                            <View className="relative">
                                <View className="w-28 h-28 rounded-full bg-primary-100 items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                    {telegramUser?.photo_url ? (
                                        <Image
                                            source={{ uri: telegramUser.photo_url }}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <User size={48} color="#3b82f6" />
                                    )}
                                </View>
                                {/* Telegram Badge */}
                                <View className="absolute -bottom-1 -right-1 bg-primary-500 rounded-full p-2 border-4 border-white">
                                    <View className="w-3 h-3 bg-white rounded-full" />
                                </View>
                            </View>
                            <View className="mt-4 items-center">
                                <Text className="text-xl font-bold text-text-main">
                                    {telegramUser?.first_name} {telegramUser?.last_name || ""}
                                </Text>
                                {telegramUser?.username && (
                                    <Text className="text-sm text-primary-600 font-medium mt-0.5">@{telegramUser.username}</Text>
                                )}
                                <Text className="text-xs text-text-secondary mt-2 bg-surface px-3 py-1 rounded-full border border-border">
                                    قم بتحديث معلوماتك الشخصية
                                </Text>
                            </View>
                        </View>

                        {/* Form Fields */}
                        <View className="space-y-5">
                            {/* Full Name */}
                            <Input
                                label="الاسم الكامل"
                                labelClassName="text-right font-bold"
                                placeholder="أدخل اسمك الكامل"
                                value={formData.fullName}
                                onChangeText={(text) => handleChange('fullName', text)}
                                className="text-right"
                                fieldClassName="bg-white"
                                {...iconSlot(<User size={20} color="#94a3b8" />)}
                            />

                            {/* Phone Number */}
                            <Input
                                label="رقم الهاتف"
                                labelClassName="text-right font-bold"
                                placeholder="05xxxxxxxx"
                                keyboardType="phone-pad"
                                value={formData.phoneNumber}
                                onChangeText={(text) => handleChange('phoneNumber', text)}
                                className="text-right"
                                fieldClassName="bg-white"
                                {...iconSlot(<Phone size={20} color="#94a3b8" />)}
                            />

                            {/* Address Line 1 */}
                            <Input
                                label="العنوان"
                                labelClassName="text-right font-bold"
                                placeholder="الشارع، المبنى، رقم الشقة"
                                value={formData.addressLine1}
                                onChangeText={(text) => handleChange('addressLine1', text)}
                                className="text-right"
                                fieldClassName="bg-white"
                                {...iconSlot(<Home size={20} color="#94a3b8" />)}
                            />

                            {/* Address Line 2 */}
                            <Input
                                label="تفاصيل إضافية (اختياري)"
                                labelClassName="text-right font-bold"
                                placeholder="معلومات إضافية عن العنوان"
                                value={formData.addressLine2}
                                onChangeText={(text) => handleChange('addressLine2', text)}
                                className="text-right"
                                fieldClassName="bg-white"
                                {...iconSlot(<Mail size={20} color="#94a3b8" />)}
                            />

                            {/* City */}
                            <Input
                                label="المدينة"
                                labelClassName="text-right font-bold"
                                placeholder="اسم المدينة"
                                value={formData.city}
                                onChangeText={(text) => handleChange('city', text)}
                                className="text-right"
                                fieldClassName="bg-white"
                                {...iconSlot(<MapPin size={20} color="#94a3b8" />)}
                            />
                        </View>

                        {/* Error Message */}
                        {error && (
                            <View className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex-row items-center justify-center">
                                <Text className="text-sm text-red-600 text-center font-medium">{error}</Text>
                            </View>
                        )}

                        {/* Submit Button */}
                        <Button
                            title={isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                            onPress={handleSubmit}
                            loading={isSaving}
                            size="lg"
                            leftIcon={<Save size={20} color="white" />}
                            className="mt-8 shadow-lg shadow-primary-500/20"
                        />

                        {/* Security Note */}
                        <View className="mt-6 p-4 bg-primary-50/50 rounded-xl border border-primary-100/50">
                            <Text className="text-xs text-primary-700 text-center font-medium">معلوماتك الشخصية محمية ومشفرة بالكامل 🔒</Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
