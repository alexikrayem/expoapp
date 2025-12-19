"use client"

import { useState } from "react"
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Image,
  I18nManager,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"
import Text from "@/components/ThemedText"
import { useAuth } from "@/context/AuthContext"
import { Redirect, router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { authService } from "@/services/authService"

const { width, height } = Dimensions.get("window")
const isRTL = I18nManager.isRTL

export default function LoginScreen() {
  const { refreshAuth, isAuthenticated, isLoading } = useAuth()

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert("خطأ", "يرجى إدخال رقم هاتف صحيح")
      return
    }

    setLoading(true)
    try {
      await authService.sendOtp(phoneNumber)
      setStep('OTP')
    } catch (error: any) {
      Alert.alert("فشل", error.message || "حدث خطأ أثناء إرسال الرمز")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert("خطأ", "يرجى إدخال الرمز المكون من 6 أرقام")
      return
    }

    setLoading(true)
    try {
      // verifyOtp returns { isNew, ... }
      const data = await authService.verifyOtp(phoneNumber, otp)

      if (data.isNew) {
        // Navigate to Registration
        router.push({
          pathname: "/register",
          params: { phoneNumber, code: otp }
        })
      } else {
        // Existing user, tokens are already set by authService -> apiClient
        await refreshAuth()
      }
    } catch (error: any) {
      Alert.alert("فشل", error.message || "رمز التحقق غير صحيح")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image source={require("../assets/images/IMG_1787.jpg")} style={styles.backgroundImage} />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,1)",
          "rgba(255,255,255,0.95)",
          "rgba(255,255,255,0.8)",
          "rgba(255,255,255,0.4)",
          "transparent"
        ]}
        locations={[0, 0.2, 0.4, 0.6, 1]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.gradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          {/* Logo & Header */}
          <View style={styles.header}>
            <Image source={require("../assets/images/logo.png")} style={styles.logo} />
            <Text style={styles.title}>المعرض الطبي</Text>
            <Text style={styles.subtitle}>
              {step === 'PHONE'
                ? "سجّل الدخول برقم هاتفك للوصول للمنتجات والعروض."
                : "أدخل رمز التحقق المرسل إلى هاتفك."}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {step === 'PHONE' ? (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: 'right' }]}
                    placeholder="رقم الهاتف (مثال: 0501234567)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>إرسال الرمز</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="keypad-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: 'right', letterSpacing: 4, fontSize: 18 }]}
                    placeholder="------"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تحقق</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('PHONE')} disabled={loading}>
                  <Text style={styles.linkText}>تغيير رقم الهاتف</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  gradient: { ...StyleSheet.absoluteFillObject, height: '100%', justifyContent: 'flex-end', paddingBottom: 0 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },

  form: { gap: 16, width: '100%' },
  inputContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 56,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  inputIcon: { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 },
  input: { flex: 1, fontSize: 16, color: '#0f172a', height: '100%' },

  button: {
    height: 56,
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  linkText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontSize: 14 }
})
