import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, KeyboardAvoidingView, Platform, I18nManager } from 'react-native';
import Text from '@/components/ThemedText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { X, User, Phone, Building, AlertCircle } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import PressableScale from '@/components/ui/PressableScale';

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
    initialData?: any;
    onSaveAndProceed: (data: any) => Promise<void>;
    availableCities?: string[];
}

export default function AddressModal({ visible, onClose, initialData = {}, onSaveAndProceed, availableCities = [] }: AddressModalProps) {
    const isRTL = I18nManager.isRTL;
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
                <View className="bg-surface rounded-t-3xl h-[90%] w-full absolute bottom-0 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-5 border-b border-border bg-white z-10">
                        <Text className="text-xl font-bold text-text-main">تفاصيل التوصيل</Text>
                        <PressableScale onPress={onClose} disabled={isSaving} scaleTo={0.9} haptic="selection" className="p-2 bg-surface rounded-full border border-border">
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
                        {error && (
                            <View className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex-row items-center">
                                <AlertCircle size={20} color="#ef4444" className="mr-2" />
                                <Text className="text-sm text-red-700 font-bold ml-2 flex-1 text-right">{error}</Text>
                            </View>
                        )}

                        <View className="space-y-5">
                            {/* Full Name */}
                            <Input
                                label="الاسم الكامل"
                                labelClassName="text-right font-bold"
                                placeholder="أدخل اسمك الكامل"
                                value={formData.fullName}
                                onChangeText={(text) => handleChange('fullName', text)}
                                editable={!isSaving}
                                className="text-right"
                                fieldClassName="bg-white"
                                error={validationErrors.fullName}
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
                                editable={!isSaving}
                                className="text-right"
                                fieldClassName="bg-white"
                                error={validationErrors.phoneNumber}
                                {...iconSlot(<Phone size={20} color="#94a3b8" />)}
                            />

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
                            <Input
                                label="العنوان الأساسي"
                                labelClassName="text-right font-bold"
                                placeholder="الشارع، رقم المبنى، المنطقة"
                                value={formData.addressLine1}
                                onChangeText={(text) => handleChange('addressLine1', text)}
                                editable={!isSaving}
                                className="text-right"
                                fieldClassName="bg-white"
                                error={validationErrors.addressLine1}
                                {...iconSlot(<Building size={20} color="#94a3b8" />)}
                            />

                            {/* Address Line 2 */}
                            <Input
                                label="تفاصيل إضافية (اختياري)"
                                labelClassName="text-right font-bold"
                                placeholder="رقم الشقة، علامة مميزة، تعليمات التوصيل..."
                                value={formData.addressLine2}
                                onChangeText={(text) => handleChange('addressLine2', text)}
                                editable={!isSaving}
                                multiline
                                numberOfLines={2}
                                className="text-right"
                                fieldClassName="bg-white"
                                style={{ minHeight: 80, textAlignVertical: 'top' }}
                                {...iconSlot(<Building size={20} color="#94a3b8" />)}
                            />
                        </View>

                        {/* Submit Button */}
                        <Button
                            title={isSaving ? "جاري الحفظ والمتابعة..." : "حفظ ومتابعة الطلب"}
                            onPress={handleSubmit}
                            loading={isSaving}
                            size="lg"
                            className="mt-8 shadow-lg shadow-primary-500/20"
                        />

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
