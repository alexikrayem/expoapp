/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Modal, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: "slide-1",
        title: "مرحباً بك في معرض المستلزمات الطبية",
        description: "تعرّف على تطبيقنا الذي يجمع أفضل العروض والمنتجات الطبية في مكانٍ واحد بسهولةٍ وأناقة.",
        icon: "🏥"
    },
    {
        id: "slide-2",
        title: "ابحث بسرعة وسهولة",
        description: "استخدم ميزة البحث المتقدّم للوصول إلى المنتجات أو العروض أو الموردين الموثوقين بسرعة فائقة.",
        icon: "🔍"
    },
    {
        id: "slide-3",
        title: "أنشئ قوائمك المميزة",
        description: "كوّن قوائمك الخاصة ورتّب منتجاتك لتظهر بشكلٍ جذّاب على الصفحة الرئيسية.",
        icon: "📋"
    },
];

const STORAGE_KEY = 'hasSeenWelcome_v1';

export default function WelcomeOnboardingModal({ visible, onFinish }: any) {
    const [index, setIndex] = useState(0);
    const [showModal, setShowModal] = useState(visible);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { login } = useAuth();

    useEffect(() => {
        setShowModal(visible);
    }, [visible]);

    const next = () => {
        if (index < slides.length - 1) {
            setIndex(index + 1);
        }
    };

    const prev = () => {
        if (index > 0) {
            setIndex(index - 1);
        }
    };

    const finish = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, 'true');
            setShowModal(false);
            if (onFinish) onFinish();
        } catch (error) {
            console.error('Failed to save onboarding status:', error);
        }
    };

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await login();
            await finish();
        } catch (error) {
            console.error('Login failed:', error);
            Alert.alert('فشل تسجيل الدخول', 'حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (!showModal) return null;

    return (
        <Modal
            visible={showModal}
            animationType="fade"
            transparent={false}
            onRequestClose={() => { }}
        >
            <View className="flex-1 bg-white">
                <LinearGradient
                    colors={['#eff6ff', '#ffffff', '#ffffff']}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%' }}
                />
                <SafeAreaView className="flex-1">
                    <View className="flex-1 items-center justify-between py-6 px-6">
                        {/* Skip Button */}
                        <TouchableOpacity
                            onPress={finish}
                            className="self-end px-4 py-2 bg-white/80 rounded-full border border-blue-100 shadow-sm"
                        >
                            <Text className="text-primary-600 font-bold text-sm">تخطي</Text>
                        </TouchableOpacity>

                        {/* Content */}
                        <View className="flex-1 items-center justify-center w-full">
                            <Animated.View
                                key={index}
                                entering={FadeInUp.springify().damping(12)}
                                className="w-72 h-72 bg-white rounded-[40px] items-center justify-center mb-12 shadow-[0_20px_50px_-12px_rgba(59,130,246,0.2)] border border-blue-50"
                            >
                                <Text className="text-9xl">{slides[index].icon}</Text>
                            </Animated.View>

                            <Animated.View
                                key={`text-${index}`}
                                entering={FadeInDown.delay(100).springify()}
                                className="items-center"
                            >
                                <Text className="text-3xl font-extrabold text-slate-800 text-center mb-4 leading-tight">
                                    {slides[index].title}
                                </Text>
                                <Text className="text-slate-500 text-center leading-7 px-4 text-lg font-medium">
                                    {slides[index].description}
                                </Text>
                            </Animated.View>
                        </View>

                        {/* Footer */}
                        <View className="w-full">
                            {/* Dots */}
                            <View className="flex-row justify-center gap-2 mb-10">
                                {slides.map((_, i) => (
                                    <View
                                        key={i}
                                        className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-primary-600' : 'w-2.5 bg-blue-100'
                                            }`}
                                    />
                                ))}
                            </View>

                            {/* Buttons */}
                            <View className="flex-col gap-3">
                                {index < slides.length - 1 ? (
                                    <View className="flex-row gap-4">
                                        {index > 0 && (
                                            <TouchableOpacity
                                                onPress={prev}
                                                className="flex-1 bg-white border border-blue-100 py-4 rounded-2xl items-center active:bg-blue-50"
                                            >
                                                <Text className="text-primary-700 font-bold text-lg">السابق</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={next}
                                            className="flex-1 bg-primary-600 py-4 rounded-2xl items-center shadow-lg shadow-primary-500/30 active:scale-[0.98]"
                                        >
                                            <Text className="text-white font-bold text-lg">التالي</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View className="w-full gap-4">
                                        <TouchableOpacity
                                            onPress={handleLogin}
                                            className="w-full bg-[#0088cc] py-4 rounded-2xl items-center shadow-lg shadow-blue-200 flex-row justify-center gap-3 active:scale-[0.98]"
                                        >
                                            <Text className="text-white font-bold text-lg">تسجيل الدخول عبر تيليجرام</Text>
                                            {isLoggingIn && <ActivityIndicator size="small" color="white" />}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={finish}
                                            className="w-full bg-white py-4 rounded-2xl items-center flex-row justify-center gap-2 border border-blue-100 shadow-sm active:bg-gray-50"
                                        >
                                            <Text className="text-slate-600 font-bold text-lg">المتابعة كزائر</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}
