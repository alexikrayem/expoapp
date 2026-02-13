"use client"

import { useState } from "react"
import {
    View,
    Alert,
    StyleSheet,
    I18nManager,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useAuth } from "@/context/AuthContext"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { authService } from "@/services/authService"

const isRTL = I18nManager.isRTL

export default function RegisterScreen() {
    const { refreshAuth, isAuthenticated } = useAuth()
    const { phoneNumber, code } = useLocalSearchParams()

    const [fullName, setFullName] = useState('')
    const [city, setCity] = useState('')
    const [address, setAddress] = useState('')
    const [loading, setLoading] = useState(false)

    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />
    }

    const handleRegister = async () => {
        if (!fullName || !city || !address) {
            Alert.alert("تنبيه", "يرجى ملء جميع الحقول المطلوبة")
            return
        }

        setLoading(true)
        try {
            const profileData = {
                full_name: fullName,
                city: city,
                address_line1: address,
                phone_number: phoneNumber // redundant but required by schema sometimes? checked backend impl
            }

            // Backend: register-phone expects { phone_number, code, profileData }
            await authService.registerWithPhone(
                phoneNumber as string,
                code as string,
                profileData
            )

            // Refresh auth to get tokens and user profile
            await refreshAuth()

            // Redirect handled by isAuthenticated check or explicit push
            router.replace("/(tabs)")

        } catch (error: any) {
            console.error("Registration error:", error);
            Alert.alert("فشل التسجيل", error.message || "حدث خطأ أثناء إنشاء الحساب")
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>

                        <View style={styles.header}>
                            <Text style={styles.title}>إكمال التسجيل</Text>
                            <Text style={styles.subtitle}>أهلاً بك! يرجى إكمال بياناتك للمتابعة.</Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="الاسم الكامل"
                                placeholder="الاسم الكامل"
                                value={fullName}
                                onChangeText={setFullName}
                                className={isRTL ? "text-right" : "text-left"}
                            />

                            <Input
                                label="المدينة"
                                placeholder="اسم مدينتك"
                                value={city}
                                onChangeText={setCity}
                                className={isRTL ? "text-right" : "text-left"}
                            />

                            <Input
                                label="العنوان"
                                placeholder="عنوان التوصيل"
                                value={address}
                                onChangeText={setAddress}
                                className={isRTL ? "text-right" : "text-left"}
                            />

                            <Button
                                title="إنشاء الحساب"
                                onPress={handleRegister}
                                loading={loading}
                                size="lg"
                                className="mt-2"
                            />

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },

    header: { marginBottom: 32, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#64748b' },

    form: { gap: 20 },
})
