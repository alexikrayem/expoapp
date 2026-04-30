/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useModal } from '@/context/ModalContext';
import { useAuth } from '@/context/AuthContext';
import { User, Briefcase, FileText, Shield, Share2, ChevronLeft, MessageSquare, MapPin, LogOut } from 'lucide-react-native';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import CitySelectionModal from '@/components/modals/CitySelectionModal';
import { useRouter } from 'expo-router';
import { userService } from '@/services/userService';

const SettingItem = React.memo(({ icon: Icon, title, subtitle, onPress, color }: any) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: '#e2e8f0' }}
    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
  >
    <View className="flex-row items-center p-4 bg-white">
      <View className="p-2.5 bg-gray-50 rounded-xl mr-4 border border-gray-100">
        <Icon size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-text-main text-base text-right mb-0.5">{title}</Text>
        {subtitle && <Text className="text-xs text-text-secondary text-right font-medium">{subtitle}</Text>}
      </View>
      <ChevronLeft size={18} color="#94a3b8" />
    </View>
  </Pressable>
));

export default function SettingsScreen() {
  const { openModal } = useModal();
  const { userProfile, refreshProfile, logout } = useAuth();
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const router = useRouter();

  const handleEditProfile = () => {
    openModal("profile", {
      telegramUser: userProfile,
      userProfile,
      onSave: async (updatedData: any) => {
        await userService.updateProfile(updatedData);
        await refreshProfile();
        Alert.alert("تم بنجاح", "تم تحديث الملف الشخصي بنجاح");
      },
    });
  };

  return (
    <AnimatedScreen>
      {/* City Selection Modal */}
      <CitySelectionModal visible={isCityModalVisible} onClose={() => setIsCityModalVisible(false)} />

      <SafeAreaView className="flex-1 bg-surface" edges={["left", "right", "bottom"]}>
        <View className="bg-white px-5 py-3 border-b border-border shadow-sm">
          <Text className="text-2xl font-bold text-text-main text-right">الإعدادات</Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary mb-3 px-2 text-right">التفضيلات</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
              <SettingItem
                icon={MapPin}
                color="#3b82f6"
                title="المدينة"
                subtitle={(userProfile as any)?.selected_city_name || 'دبي'}
                onPress={() => setIsCityModalVisible(true)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary mb-3 px-2 text-right">الحساب</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
              <SettingItem
                icon={User}
                color="#3b82f6"
                title="المعلومات الشخصية"
                subtitle={userProfile?.full_name || "عرض وتعديل التفاصيل الشخصية"}
                onPress={handleEditProfile}
              />
              <View className="h-px bg-gray-50 mx-4" />
              <SettingItem
                icon={Briefcase}
                color="#6366f1"
                title="معلومات العيادة"
                subtitle={userProfile?.clinic_name || "عرض وتعديل تفاصيل العيادة"}
                onPress={handleEditProfile}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary mb-3 px-2 text-right">قانوني</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
              <SettingItem
                icon={Shield}
                color="#10b981"
                title="سياسة الخصوصية"
                onPress={() => Alert.alert("معلومة", "سياسة الخصوصية قريباً")}
              />
              <View className="h-px bg-gray-50 mx-4" />
              <SettingItem
                icon={FileText}
                color="#eab308"
                title="الشروط والأحكام"
                onPress={() => Alert.alert("معلومة", "الشروط والأحكام قريباً")}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary mb-3 px-2 text-right">تواصل معنا</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
              <SettingItem
                icon={Share2}
                color="#ec4899"
                title="تابعنا على وسائل التواصل"
                onPress={() => Alert.alert("معلومة", "روابط التواصل الاجتماعي قريباً")}
              />
              <View className="h-px bg-gray-50 mx-4" />
              <SettingItem
                icon={MessageSquare}
                color="#8b5cf6"
                title="أرسل ملاحظاتك"
                subtitle="ساعدنا في تحسين التطبيق"
                onPress={() => openModal('feedback')}
              />
            </View>
          </View>

          {/* Logout Section */}
          <View className="mb-6">
            <Pressable
              onPress={() => {
                Alert.alert(
                  'تسجيل الخروج',
                  'هل أنت متأكد من تسجيل الخروج؟',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    {
                      text: 'تسجيل الخروج',
                      style: 'destructive',
                      onPress: async () => {
                        await logout();
                        router.replace('/login');
                      },
                    },
                  ]
                );
              }}
              android_ripple={{ color: '#fecaca' }}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <View className="bg-red-50 rounded-2xl p-4 flex-row items-center justify-center border border-red-200">
                <Text className="text-red-600 font-bold text-base mr-2">تسجيل الخروج</Text>
                <LogOut size={20} color="#dc2626" />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AnimatedScreen>
  );
}
