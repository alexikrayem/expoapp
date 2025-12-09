import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Text from '@/components/ThemedText';
import { X, User, Phone, MapPin, Building, AlertCircle, Loader2 } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
    initialData?: any;
    onSaveAndProceed: (data: any) => Promise<void>;
    availableCities?: string[];
}

export default function AddressModal({ visible, onClose, initialData = {}, onSaveAndProceed, availableCities = [] }: AddressModalProps) {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
    });
    const [validationErrors, setValidationErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [visible, initialData]);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors((prev: any) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const errors: any = {};
        if (!formData.fullName.trim()) errors.fullName = 'الاسم الكامل مطلوب';
        if (!formData.phoneNumber.trim()) {
            errors.phoneNumber = 'رقم الهاتف مطلوب';
        } else if (!/^[0-9+\-\s()]{10,}$/.test(formData.phoneNumber.trim())) {
            errors.phoneNumber = 'رقم الهاتف غير صحيح';
        }
        if (!formData.addressLine1.trim()) errors.addressLine1 = 'العنوان مطلوب';
        if (!formData.city.trim()) errors.city = 'المدينة مطلوبة';

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setError(null);
        setIsSaving(true);
        try {
            await onSaveAndProceed(formData);
            // onClose is usually handled by the parent after successful save or by the next step
        } catch (err: any) {
            setError(err.message || 'Failed to save address');
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
                <View className="bg-surface rounded-t-3xl h-[90%] w-full absolute bottom-0 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-5 border-b border-border bg-white z-10">
                        <Text className="text-xl font-bold text-text-main">تفاصيل التوصيل</Text>
                        <TouchableOpacity onPress={onClose} disabled={isSaving} className="p-2 bg-surface rounded-full border border-border">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                        {error && (
                            <View className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex-row items-center">
                                <AlertCircle size={20} color="#ef4444" className="mr-2" />
                                <Text className="text-sm text-red-700 font-bold ml-2 flex-1 text-right">{error}</Text>
                            </View>
                        )}

                        <View className="space-y-5">
                            {/* Full Name */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">الاسم الكامل</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <User size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className={`w-full pl-12 pr-4 py-3.5 border rounded-xl bg-white text-right text-text-main focus:bg-primary-50/30 ${validationErrors.fullName ? 'border-red-300 bg-red-50' : 'border-border focus:border-primary-500'}`}
                                        placeholder="أدخل اسمك الكامل"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.fullName}
                                        onChangeText={(text) => handleChange('fullName', text)}
                                        editable={!isSaving}
                                        style={{ fontFamily: 'TajawalCustom' }}
                                    />
                                </View>
                                {validationErrors.fullName && <Text className="text-red-500 text-xs mt-1.5 text-right font-medium">{validationErrors.fullName}</Text>}
                            </View>

                            {/* Phone Number */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">رقم الهاتف</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Phone size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className={`w-full pl-12 pr-4 py-3.5 border rounded-xl bg-white text-right text-text-main focus:bg-primary-50/30 ${validationErrors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-border focus:border-primary-500'}`}
                                        placeholder="05xxxxxxxx"
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="phone-pad"
                                        value={formData.phoneNumber}
                                        onChangeText={(text) => handleChange('phoneNumber', text)}
                                        editable={!isSaving}
                                        style={{ fontFamily: 'TajawalCustom' }}
                                    />
                                </View>
                                {validationErrors.phoneNumber && <Text className="text-red-500 text-xs mt-1.5 text-right font-medium">{validationErrors.phoneNumber}</Text>}
                            </View>

                            {/* City */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">المدينة</Text>
                                <View className={`border rounded-xl bg-white overflow-hidden ${validationErrors.city ? 'border-red-300 bg-red-50' : 'border-border'}`}>
                                    <Picker
                                        selectedValue={formData.city}
                                        onValueChange={(itemValue: string) => handleChange('city', itemValue)}
                                        enabled={!isSaving}
                                        style={{ height: Platform.OS === 'ios' ? 150 : 56 }}
                                    >
                                        <Picker.Item label="اختر المدينة..." value="" color="#94a3b8" />
                                        {availableCities.map((city) => (
                                            <Picker.Item key={city} label={city} value={city} color="#0f172a" />
                                        ))}
                                    </Picker>
                                </View>
                                {validationErrors.city && <Text className="text-red-500 text-xs mt-1.5 text-right font-medium">{validationErrors.city}</Text>}
                            </View>

                            {/* Address Line 1 */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">العنوان الأساسي</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Building size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className={`w-full pl-12 pr-4 py-3.5 border rounded-xl bg-white text-right text-text-main focus:bg-primary-50/30 ${validationErrors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-border focus:border-primary-500'}`}
                                        placeholder="الشارع، رقم المبنى، المنطقة"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.addressLine1}
                                        onChangeText={(text) => handleChange('addressLine1', text)}
                                        editable={!isSaving}
                                        style={{ fontFamily: 'TajawalCustom' }}
                                    />
                                </View>
                                {validationErrors.addressLine1 && <Text className="text-red-500 text-xs mt-1.5 text-right font-medium">{validationErrors.addressLine1}</Text>}
                            </View>

                            {/* Address Line 2 */}
                            <View>
                                <Text className="text-sm font-bold text-text-main mb-2 text-right">تفاصيل إضافية (اختياري)</Text>
                                <View className="relative">
                                    <View className="absolute left-4 top-4 z-10">
                                        <Building size={20} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl bg-white text-right text-text-main focus:border-primary-500 focus:bg-primary-50/30"
                                        placeholder="رقم الشقة، علامة مميزة، تعليمات التوصيل..."
                                        placeholderTextColor="#94a3b8"
                                        value={formData.addressLine2}
                                        onChangeText={(text) => handleChange('addressLine2', text)}
                                        editable={!isSaving}
                                        multiline
                                        numberOfLines={2}
                                        style={{ minHeight: 80, textAlignVertical: 'top', fontFamily: 'TajawalCustom' }}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isSaving}
                            className={`mt-8 w-full py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-primary-500/20 active:scale-[0.98] ${isSaving ? 'bg-primary-400' : 'bg-primary-600'}`}
                        >
                            {isSaving ? (
                                <>
                                    <ActivityIndicator color="white" className="mr-2" />
                                    <Text className="text-white font-bold text-lg">جاري الحفظ والمتابعة...</Text>
                                </>
                            ) : (
                                <Text className="text-white font-bold text-lg">حفظ ومتابعة الطلب</Text>
                            )}
                        </TouchableOpacity>

                        <View className="mt-6">
                            <Text className="text-xs text-text-secondary text-center font-medium">
                                سيتم حفظ هذه المعلومات لتسهيل الطلبات المستقبلية 📦
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
