import React, { useState } from 'react';
import TelegramLoginWidget from '../components/TelegramLoginWidget';
import LoginCarousel from '../components/LoginCarousel';
import PersonalInfoForm from '../components/onboarding/PersonalInfoForm';
import ProfessionalInfoForm from '../components/onboarding/ProfessionalInfoForm';
import ClinicInfoForm from '../components/onboarding/ClinicInfoForm';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Mock Cities (Replace with useQueries or API call in real implementation if needed)
const CITIES = [
    { id: 1, name: 'Dubai' },
    { id: 2, name: 'Abu Dhabi' },
    { id: 3, name: 'Sharjah' },
    { id: 4, name: 'Damascus' },
    { id: 5, name: 'Aleppo' },
    { id: 6, name: 'Homs' },
    { id: 7, name: 'Latakia' }
];

const LoginPage = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('login'); // 'login' | 'register'
    const [step, setStep] = useState(1); // 1: Personal, 2: Professional, 3: Clinic
    const [authData, setAuthData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Consolidated Form State
    const [formData, setFormData] = useState({
        // Personal
        full_name: '',
        phone_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        selected_city_id: null,
        date_of_birth: '',
        gender: '',

        // Professional
        professional_role: '',
        years_of_experience: '',
        education_background: '',
        additional_info: '',
        professional_license_number: '',

        // Clinic
        clinic_name: '',
        clinic_phone: '',
        clinic_address_line1: '',
        clinic_address_line2: '',
        clinic_city: '',
        clinic_country: '',
        clinic_license_number: '',
        clinic_specialization: '',
        clinic_coordinates: null
    });

    const [formErrors, setFormErrors] = useState({});

    const handleLoginSuccess = async (user) => {
        try {
            console.log("Telegram Auth Success:", user);
            // Try to login directly
            await authService.telegramLoginWidget(user);

            // If checking user succeeds (200 OK), redirect
            handleAuthSuccess(user);
        } catch (err) {
            console.error("Login Check Failed:", err);

            // Check if User Not Found (404) -> Register
            if (err.response && err.response.status === 404) {
                console.log("User not found, prompt registration");
                setAuthData(user);
                // Pre-fill name from Telegram
                setFormData(prev => ({
                    ...prev,
                    full_name: [user.first_name, user.last_name].filter(Boolean).join(' ')
                }));
                setView('register');
                setStep(1); // Start at step 1
            } else {
                setError("حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.");
            }
        }
    };

    const handleAuthSuccess = (user) => {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'telegram_auth', user: user }));
        } else {
            navigate('/');
        }
    };

    const handleLoginError = (err) => {
        console.error('Login Widget Error:', err);
        setError("فشل الاتصال بتيليجرام");
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for field
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.full_name) newErrors.full_name = "الاسم الكامل مطلوب";
            if (!formData.phone_number) newErrors.phone_number = "رقم الهاتف مطلوب";
            if (!formData.address_line1) newErrors.address_line1 = "العنوان مطلوب";
            if (!formData.city) newErrors.city = "المدينة مطلوبة";
        }
        if (currentStep === 3) { // Clinic Step
            if (!formData.clinic_name) newErrors.clinic_name = "اسم العيادة مطلوب";
            if (!formData.clinic_phone) newErrors.clinic_phone = "هاتف العيادة مطلوب";
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateStep(step)) return;
        setStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            setView('login');
        }
    };

    const handleRegister = async () => {
        if (!validateStep(step)) return; // Validate final step

        setLoading(true);
        setError(null);

        try {
            await authService.telegramRegister(authData, formData);
            handleAuthSuccess(authData);
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.response?.data?.error || "فشل إنشاء الحساب. تأكد من البيانات.");
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    const renderStep = () => {
        switch (step) {
            case 1:
                return <PersonalInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            case 2:
                return <ProfessionalInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            case 3:
                return <ClinicInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex font-['Inter',_sans-serif] bg-white text-slate-900" dir="rtl">

            {/* Left Side: Carousel (Desktop) */}
            <div className="hidden lg:block w-1/2 relative bg-[#F5F7FA] overflow-hidden sticky top-0 h-screen">
                <LoginCarousel />
            </div>

            {/* Right Side: Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {view === 'login' ? (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="w-full max-w-sm flex flex-col"
                        >
                            {/* Login View Content */}
                            <div className="mb-12 text-center lg:text-right">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl mb-6 shadow-sm ring-1 ring-blue-100">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">تسجيل الدخول</h1>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    مرحباً بك! يرجى تسجيل الدخول للوصول إلى لوحة التحكم.
                                </p>
                            </div>

                            <div className="w-full mb-8">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
                                    <div className="relative bg-white p-6 rounded-2xl ring-1 ring-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] flex flex-col items-center justify-center min-h-[160px]">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">الدخول السريع</p>
                                        <TelegramLoginWidget
                                            onLoginSuccess={handleLoginSuccess}
                                            onError={handleLoginError}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                            <div className="text-center lg:text-right mt-auto">
                                <p className="text-xs text-slate-400">
                                    بالتسجيل، أنت توافق على <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">شروط الخدمة</a>.
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="w-full max-w-lg"
                        >
                            {/* Registration Wizard Header */}
                            <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">إكمال التسجيل</h2>
                                    <p className="text-slate-500 text-sm">خطوة {step} من 3</p>
                                </div>
                                <button onClick={handleBack} className="text-sm text-slate-400 hover:text-slate-600">
                                    {step === 1 ? 'إلغاء' : 'سابق'}
                                </button>
                            </div>

                            {/* Step Content */}
                            <div className="bg-white rounded-2xl p-1 mb-6 min-h-[400px]">
                                {renderStep()}
                            </div>

                            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

                            <div className="flex gap-4">
                                {step < 3 ? (
                                    <button
                                        onClick={handleNext}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                                    >
                                        متابعة
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={loading}
                                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-70"
                                    >
                                        {loading ? 'جاري الإنشاء...' : 'إتمام التسجيل'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LoginPage;
