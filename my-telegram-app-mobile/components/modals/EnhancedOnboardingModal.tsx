import React, { useState, useEffect, useRef } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { X, ChevronRight, ChevronLeft, Check, User, Building2, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';
import { cityService } from '@/services/cityService';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

interface EnhancedOnboardingModalProps {
    visible: boolean;
    onFinish: () => void;
    onSkip: () => void;
}

export default function EnhancedOnboardingModal({ visible, onFinish, onSkip }: EnhancedOnboardingModalProps) {
    const { userProfile, refreshProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        clinic_name: '',
        clinic_phone: '',
        clinic_address_line1: '',
        clinic_address_line2: '',
        clinic_city: '',
        selected_city_id: null as number | null,
        professional_role: '',
        years_of_experience: '',
        education_background: '',
        professional_license_number: '',
    });

    useEffect(() => {
        if (visible) {
            loadInitialData();
        }
    }, [visible]);

    const loadInitialData = async () => {
        try {
            const [citiesData] = await Promise.all([
                cityService.getCities()
            ]);
            setCities(citiesData || []);

            if (userProfile) {
                setFormData(prev => ({
                    ...prev,
                    full_name: userProfile.full_name || '',
                    phone_number: userProfile.phone_number || '',
                    address_line1: userProfile.address_line1 || '',
                    address_line2: userProfile.address_line2 || '',
                    city: userProfile.city || '',
                    clinic_name: userProfile.clinic_name || '',
                    clinic_phone: userProfile.clinic_phone || '',
                    clinic_address_line1: userProfile.clinic_address_line1 || '',
                    clinic_address_line2: userProfile.clinic_address_line2 || '',
                    clinic_city: userProfile.clinic_city || '',
                    selected_city_id: userProfile.selected_city_id || null,
                    professional_role: userProfile.professional_role || '',
                    years_of_experience: userProfile.years_of_experience || '',
                    education_background: userProfile.education_background || '',
                    professional_license_number: userProfile.professional_license_number || '',
                }));
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep = (currentStep: number) => {
        if (currentStep === 1) {
            if (!formData.full_name.trim()) {
                Alert.alert('تنبيه', 'الرجاء إدخال الاسم الكامل');
                return false;
            }
            if (!formData.phone_number.trim()) {
                Alert.alert('تنبيه', 'الرجاء إدخال رقم الهاتف');
                return false;
            }
        } else if (currentStep === 2) {
            if (!formData.clinic_name.trim()) {
                Alert.alert('تنبيه', 'الرجاء إدخال اسم العيادة');
                return false;
            }
            if (!formData.clinic_phone.trim()) {
                Alert.alert('تنبيه', 'الرجاء إدخال هاتف العيادة');
                return false;
            }
            if (!formData.selected_city_id) {
                Alert.alert('تنبيه', 'الرجاء اختيار المدينة');
                return false;
            }
        }
        return true;
    };

    const handleNext = async () => {
        if (step < 3) {
            if (validateStep(step)) {
                setStep(prev => prev + 1);
            }
        } else {
            // Submit
            setLoading(true);
            try {
                await userService.updateProfile(formData);
                await refreshProfile();
                onFinish();
            } catch (error) {
                console.error('Error saving profile:', error);
                Alert.alert('خطأ', 'حدث خطأ أثناء حفظ البيانات');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        }
    };

    const renderStepIndicator = () => (
        <View className="flex-row justify-center items-center mb-8 px-4">
            {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                    <View className={`w-12 h-12 rounded-full items-center justify-center border-2 shadow-sm transition-all ${step >= s ? 'bg-primary-600 border-primary-600 shadow-primary-200' : 'bg-white border-gray-200'
                        }`}>
                        {s === 1 && <User size={22} color={step >= s ? 'white' : '#9CA3AF'} />}
                        {s === 2 && <Building2 size={22} color={step >= s ? 'white' : '#9CA3AF'} />}
                        {s === 3 && <Briefcase size={22} color={step >= s ? 'white' : '#9CA3AF'} />}
                    </View>
                    {s < 3 && (
                        <View className={`h-1 w-12 mx-2 rounded-full ${step > s ? 'bg-primary-600' : 'bg-gray-100'}`} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );

    const renderInput = (label: string, value: string, field: string, placeholder: string, keyboardType: any = 'default', required = false) => (
        <View className="mb-5">
            <Text className="text-right text-text-secondary mb-2 font-medium text-sm">{label} {required && <Text className="text-red-500">*</Text>}</Text>
            <TextInput
                className="bg-white border border-gray-200 rounded-2xl p-4 text-right text-text-main text-base shadow-sm focus:border-primary-500 focus:bg-blue-50/30"
                value={value}
                onChangeText={(text) => updateField(field, text)}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
            />
        </View>
    );

    const renderPersonalInfo = () => (
        <Animated.View entering={SlideInRight} exiting={SlideOutLeft} className="space-y-2">
            <Text className="text-2xl font-bold text-right mb-1 text-slate-800">المعلومات الشخصية</Text>
            <Text className="text-right text-slate-500 mb-6">يرجى إدخال بياناتك الشخصية للتواصل</Text>

            {renderInput('الاسم الكامل', formData.full_name, 'full_name', 'أدخل اسمك الكامل', 'default', true)}
            {renderInput('رقم الهاتف', formData.phone_number, 'phone_number', 'أدخل رقم هاتفك', 'phone-pad', true)}
            {renderInput('العنوان', formData.address_line1, 'address_line1', 'أدخل عنوانك')}
        </Animated.View>
    );

    const renderClinicInfo = () => (
        <Animated.View entering={SlideInRight} exiting={SlideOutLeft} className="space-y-2">
            <Text className="text-2xl font-bold text-right mb-1 text-slate-800">معلومات العيادة</Text>
            <Text className="text-right text-slate-500 mb-6">تفاصيل العيادة أو المركز الطبي</Text>

            {renderInput('اسم العيادة', formData.clinic_name, 'clinic_name', 'أدخل اسم العيادة', 'default', true)}
            {renderInput('هاتف العيادة', formData.clinic_phone, 'clinic_phone', 'أدخل رقم هاتف العيادة', 'phone-pad', true)}

            <View className="mb-5">
                <Text className="text-right text-text-secondary mb-2 font-medium text-sm">المدينة <Text className="text-red-500">*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1" contentContainerStyle={{ paddingRight: 4 }}>
                    {cities.map((city) => (
                        <TouchableOpacity
                            key={city.id}
                            onPress={() => updateField('selected_city_id', city.id)}
                            className={`mr-2 px-5 py-3 rounded-2xl border shadow-sm ${formData.selected_city_id === city.id
                                ? 'bg-primary-600 border-primary-600 shadow-primary-200'
                                : 'bg-white border-gray-200'
                                }`}
                        >
                            <Text className={`font-medium ${formData.selected_city_id === city.id ? 'text-white' : 'text-gray-600'}`}>
                                {city.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {renderInput('عنوان العيادة', formData.clinic_address_line1, 'clinic_address_line1', 'أدخل عنوان العيادة')}
        </Animated.View>
    );

    const renderProfessionalInfo = () => (
        <Animated.View entering={SlideInRight} exiting={SlideOutLeft} className="space-y-2">
            <Text className="text-2xl font-bold text-right mb-1 text-slate-800">المعلومات المهنية</Text>
            <Text className="text-right text-slate-500 mb-6">خبراتك ومؤهلاتك المهنية</Text>

            {renderInput('المسمى الوظيفي', formData.professional_role, 'professional_role', 'مثال: طبيب أسنان عام')}
            {renderInput('سنوات الخبرة', formData.years_of_experience, 'years_of_experience', 'عدد سنوات الخبرة', 'numeric')}
            {renderInput('رقم الترخيص المهني', formData.professional_license_number, 'professional_license_number', 'أدخل رقم الترخيص')}
        </Animated.View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onSkip}
        >
            <SafeAreaView className="flex-1 bg-gray-50">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-100 shadow-sm z-10">
                        <TouchableOpacity onPress={onSkip} className="px-4 py-2 bg-gray-100 rounded-full">
                            <Text className="text-slate-600 font-medium text-sm">تخطي</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-slate-800">إكمال الملف الشخصي</Text>
                        <View className="w-16" />
                    </View>

                    <ScrollView className="flex-1 p-6">
                        {renderStepIndicator()}

                        {step === 1 && renderPersonalInfo()}
                        {step === 2 && renderClinicInfo()}
                        {step === 3 && renderProfessionalInfo()}

                        <View className="h-20" />
                    </ScrollView>

                    <View className="p-5 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <View className="flex-row gap-4">
                            {step > 1 && (
                                <TouchableOpacity
                                    onPress={handleBack}
                                    className="flex-1 bg-white border border-gray-200 py-4 rounded-2xl items-center active:bg-gray-50"
                                >
                                    <Text className="text-slate-700 font-bold text-lg">السابق</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={loading}
                                className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 shadow-lg shadow-primary-500/30 active:scale-[0.98] ${loading ? 'bg-primary-400' : 'bg-primary-600'
                                    }`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-lg">
                                            {step === 3 ? 'حفظ وإنهاء' : 'التالي'}
                                        </Text>
                                        {step < 3 ? (
                                            <ChevronLeft size={20} color="white" />
                                        ) : (
                                            <Check size={20} color="white" />
                                        )}
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}
