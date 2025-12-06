import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { ChevronLeft, User, Briefcase, FileText, Shield, Share2 } from 'lucide-react';

const SettingsPage = () => {
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext() || {};
    const { openModal } = useModal();
    const navigate = useNavigate();

    const handleEditProfile = () => {
        openModal("profile", {
            telegramUser,
            userProfile,
            onFormSubmit: (e, updatedData) => {
                // This logic should ideally be in a shared service,
                // but for now, we'll keep it here.
                console.log("Updating profile...", updatedData);
                // The modal itself will handle the submission logic.
                // We just need to open it.
            },
        });
    };

    const SettingItem = ({ icon, title, subtitle, onClick }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center text-right p-4 bg-white hover:bg-gray-50 transition-colors rounded-lg"
        >
            <div className="p-3 bg-gray-100 rounded-full mr-4">
                {icon}
            </div>
            <div className="flex-grow">
                <h3 className="font-semibold text-gray-800">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            <ChevronLeft className="h-5 w-5 text-gray-400" />
        </button>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-24" dir="rtl">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm shadow-sm z-10">
                <div className="max-w-2xl mx-auto p-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ChevronLeft className="h-6 w-6 transform rotate-180" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">الإعدادات</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 space-y-6">
                {/* Account Section */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 px-4">الحساب</h2>
                    <SettingItem
                        icon={<User className="h-5 w-5 text-blue-600" />}
                        title="المعلومات الشخصية"
                        subtitle={userProfile?.full_name || "عرض وتعديل التفاصيل الشخصية"}
                        onClick={handleEditProfile}
                    />
                    <SettingItem
                        icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
                        title="معلومات العيادة"
                        subtitle={userProfile?.clinic_name || "عرض وتعديل تفاصيل العيادة"}
                        onClick={handleEditProfile}
                    />
                </div>

                {/* Legal Section */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 px-4">قانوني</h2>
                    <SettingItem
                        icon={<Shield className="h-5 w-5 text-green-600" />}
                        title="سياسة الخصوصية"
                        onClick={() => alert("Placeholder for Privacy Policy")}
                    />
                    <SettingItem
                        icon={<FileText className="h-5 w-5 text-yellow-600" />}
                        title="الشروط والأحكام"
                        onClick={() => alert("Placeholder for Terms & Conditions")}
                    />
                </div>

                {/* Social Media Section */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 px-4">تواصل معنا</h2>
                    <SettingItem
                        icon={<Share2 className="h-5 w-5 text-pink-600" />}
                        title="تابعنا على وسائل التواصل"
                        onClick={() => alert("Placeholder for Social Media Links")}
                    />
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
