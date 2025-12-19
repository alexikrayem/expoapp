"use client"

import { useState } from "react"
import {
    View,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Image,
    I18nManager,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useAuth } from "@/context/AuthContext"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
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

                            {/* Full Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الاسم الكامل</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder="الاسم الكامل"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            {/* City */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>المدينة</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder="اسم مدينتك"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>

                            {/* Address */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>العنوان</Text>
                                <TextInput
                                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                                    placeholder="عنوان التوصيل"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>إنشاء الحساب</Text>}
                            </TouchableOpacity>

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
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', textAlign: isRTL ? 'right' : 'left' },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#0f172a'
    },

    button: {
        height: 56,
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#0ea5e9',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
