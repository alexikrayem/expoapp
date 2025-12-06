/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { useModal } from '@/context/ModalContext';
import { useAuth } from '@/context/AuthContext';
import { User, Briefcase, FileText, Shield, Share2, ChevronLeft, MessageSquare, MapPin } from 'lucide-react-native';
import AnimatedScreen from '@/components/ui/AnimatedScreen';
import CitySelectionModal from '@/components/modals/CitySelectionModal';

const SettingItem = ({ icon: Icon, title, subtitle, onPress, color }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center p-4 bg-white active:bg-gray-50 transition-colors"
  >
    <View className="p-2.5 bg-gray-50 rounded-xl mr-4 border border-gray-100">
      <Icon size={22} color={color} />
    </View>
    <View className="flex-1">
      <Text className="font-bold text-text-main text-base text-right mb-0.5">{title}</Text>
      {subtitle && <Text className="text-xs text-text-secondary text-right font-medium">{subtitle}</Text>}
    </View>
    <ChevronLeft size={18} color="#94a3b8" />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { openModal } = useModal();
  const { userProfile, refreshProfile } = useAuth();
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);

  const handleEditProfile = () => {
    openModal("profile", {
      userProfile,
      onFormSubmit: async (e: any, updatedData: any) => {
        console.log("Profile updated via modal, refreshing context...");
        await refreshProfile();
        Alert.alert("تم بنجاح", "تم تحديث الملف الشخصي بنجاح");
      },
    });
  };

  return (
    <AnimatedScreen>
      {/* City Selection Modal */}
      <CitySelectionModal visible={isCityModalVisible} onClose={() => setIsCityModalVisible(false)} />

      <SafeAreaView className="flex-1 bg-surface">
        <View className="bg-white p-5 border-b border-border shadow-sm">
          <Text className="text-2xl font-bold text-text-main text-right">الإعدادات</Text>
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="mb-8">
            <Text className="text-sm font-bold text-primary-600 mb-3 px-2 text-right uppercase tracking-wider">التفضيلات</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm">
              <SettingItem
                icon={MapPin}
                color="#3b82f6"
                title="المدينة"
                subtitle={userProfile?.selected_city_name || 'دبي'}
                onPress={() => setIsCityModalVisible(true)}
              />
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-sm font-bold text-primary-600 mb-3 px-2 text-right uppercase tracking-wider">الحساب</Text>
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

          <View className="mb-8">
            <Text className="text-sm font-bold text-primary-600 mb-3 px-2 text-right uppercase tracking-wider">قانوني</Text>
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

          <View className="mb-8">
            <Text className="text-sm font-bold text-primary-600 mb-3 px-2 text-right uppercase tracking-wider">تواصل معنا</Text>
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
        </ScrollView>
      </SafeAreaView>
    </AnimatedScreen>
  );
}
