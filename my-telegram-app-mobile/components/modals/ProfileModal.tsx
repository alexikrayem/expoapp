import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import Text from '@/components/ThemedText';
import { X, User, Phone, Home, MapPin, Mail, Save, Loader2 } from 'lucide-react-native';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    telegramUser: any;
    userProfile: any;
    onSave: (data: any) => Promise<void>;
}

export default function ProfileModal({ visible, onClose, telegramUser, userProfile, onSave }: ProfileModalProps) {
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
                        <TouchableOpacity onPress={onClose} className="p-2 bg-surface rounded-full border border-border">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">الاسم الكامل</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <User size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="أدخل اسمك الكامل"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.fullName}
                                        onChangeText={(text) => handleChange('fullName', text)}
                                    />
                                </View>
                            </View>

                            {/* Phone Number */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">رقم الهاتف</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Phone size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="05xxxxxxxx"
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="phone-pad"
                                        value={formData.phoneNumber}
                                        onChangeText={(text) => handleChange('phoneNumber', text)}
                                    />
                                </View>
                            </View>

                            {/* Address Line 1 */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">العنوان</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Home size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="الشارع، المبنى، رقم الشقة"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.addressLine1}
                                        onChangeText={(text) => handleChange('addressLine1', text)}
                                    />
                                </View>
                            </View>

                            {/* Address Line 2 */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">تفاصيل إضافية (اختياري)</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Mail size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="معلومات إضافية عن العنوان"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.addressLine2}
                                        onChangeText={(text) => handleChange('addressLine2', text)}
                                    />
                                </View>
                            </View>

                            {/* City */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">المدينة</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <MapPin size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="اسم المدينة"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.city}
                                        onChangeText={(text) => handleChange('city', text)}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Error Message */}
                        {error && (
                            <View className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex-row items-center justify-center">
                                <Text className="text-sm text-red-600 text-center font-medium">{error}</Text>
                            </View>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isSaving}
                            className={`mt-8 w-full py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-primary-500/20 active:scale-[0.98] ${isSaving ? 'bg-primary-400' : 'bg-primary-600'}`}
                        >
                            {isSaving ? (
                                <>
                                    <ActivityIndicator color="white" className="mr-2" />
                                    <Text className="text-white font-bold text-lg">جاري الحفظ...</Text>
                                </>
                            ) : (
                                <>
                                    <Save size={20} color="white" className="mr-2" />
                                    <Text className="text-white font-bold text-lg">حفظ التغييرات</Text>
                                </>
                            )}
                        </TouchableOpacity>

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
