import React, { useState } from 'react';
import LoginCarousel from '../components/LoginCarousel';
import PersonalInfoForm from '../components/onboarding/PersonalInfoForm';
import ProfessionalInfoForm from '../components/onboarding/ProfessionalInfoForm';
import ClinicInfoForm from '../components/onboarding/ClinicInfoForm';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Mock Cities 
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

    // Auth Flow State: 'phone' -> 'otp' -> 'register'
    const [view, setView] = useState('phone');
    const [step, setStep] = useState(1); // Registration Wizard Step: 1, 2, 3

    // Auth Data
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Consolidated Registration Form Data
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

    // --- OTP Handlers ---

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError(null);
        if (!phoneNumber || phoneNumber.length < 9) {
            setError("يرجى إدخال رقم هاتف صحيح");
            return;
        }

        setLoading(true);
        try {
            const res = await authService.sendOtp(phoneNumber);
            // In Dev, show code in alert or console for convenience
            if (res.dev_code) console.log("Dev OTP Code:", res.dev_code);
            setView('otp');
        } catch (err) {
            console.error("Send OTP Error:", err);
            setError(err.message || "فشل إرسال الرمز. يرجى المحاولة لاحقاً.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(null);
        if (!otpCode || otpCode.length !== 6) {
            setError("يرجى إدخال الرمز المكون من 6 أرقام");
            return;
        }

        setLoading(true);
        try {
            const res = await authService.verifyOtp(phoneNumber, otpCode);

            if (res.isNew) {
                // New User -> Go to Registration Wizard
                setFormData(prev => ({ ...prev, phone_number: phoneNumber })); // Pre-fill phone
                setView('register');
                setStep(1);
            } else {
                // Existing User -> Success
                handleAuthSuccess(res.userProfile);
            }
        } catch (err) {
            console.error("Verify OTP Error:", err);
            setError(err.message || "رمز التحقق غير صحيح");
        } finally {
            setLoading(false);
        }
    };

    const handleAuthSuccess = (user) => {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth_success', user }));
        } else {
            navigate('/');
        }
    };

    // --- Registration Wizard Handlers ---

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: null }));
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.full_name) newErrors.full_name = "الاسم الكامل مطلوب";
            if (!formData.address_line1) newErrors.address_line1 = "العنوان مطلوب";
            if (!formData.city) newErrors.city = "المدينة مطلوبة";
        }
        if (currentStep === 3) {
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
            // Cancel registration, go back to login? Or logout?
            // For now, reload to restart flow
            window.location.reload();
        }
    };

    const handleRegister = async () => {
        if (!validateStep(step)) return;

        setLoading(true);
        setError(null);

        try {
            const res = await authService.registerWithPhone(phoneNumber, otpCode, formData);
            handleAuthSuccess(res.userProfile);
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message || "فشل إنشاء الحساب. تأكد من البيانات.");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1: return <PersonalInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            case 2: return <ProfessionalInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            case 3: return <ClinicInfoForm formData={formData} onInputChange={handleInputChange} errors={formErrors} cities={CITIES} />;
            default: return null;
        }
    };

    // --- UI Components ---
    const inputClassName = `w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-lg text-slate-900 bg-slate-50/50 hover:bg-white text-center tracking-wide`;

    return (
        <div className="min-h-screen flex font-['Inter',_sans-serif] bg-white text-slate-900" dir="rtl">

            {/* Left Side: Carousel (Desktop) */}
            <div className="hidden lg:block w-1/2 relative bg-[#F5F7FA] overflow-hidden sticky top-0 h-screen">
                <LoginCarousel />
            </div>

            {/* Right Side: Auth Forms */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* View: Phone Input */}
                    {view === 'phone' && (
                        <motion.div
                            key="phone"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-sm flex flex-col items-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-8 shadow-sm ring-1 ring-blue-100">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">تسجيل الدخول</h1>
                            <p className="text-slate-500 mb-8 text-center">أدخل رقم هاتفك للمتابعة</p>

                            <form onSubmit={handleSendOtp} className="w-full space-y-6">
                                <div>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="09xx xxx xxx"
                                        className={inputClassName}
                                        dir="ltr"
                                        autoFocus
                                    />
                                </div>

                                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                                </button>
                            </form>
                            <p className="mt-8 text-xs text-slate-400">ستصلك رسالة نصية تحتوي على رمز التحقق</p>
                        </motion.div>
                    )}

                    {/* View: OTP Verification */}
                    {view === 'otp' && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-sm flex flex-col items-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-8 shadow-sm ring-1 ring-blue-100">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">تأكيد الرمز</h1>
                            <p className="text-slate-500 mb-8 text-center">أدخل الرمز المرسل إلى {phoneNumber}</p>

                            <form onSubmit={handleVerifyOtp} className="w-full space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        placeholder="---- --"
                                        className={`${inputClassName} tracking-[0.5em] text-2xl font-mono`}
                                        maxLength="6"
                                        dir="ltr"
                                        autoFocus
                                        autoComplete="one-time-code"
                                    />
                                </div>

                                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70"
                                >
                                    {loading ? 'جاري التحقق...' : 'دخول'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setView('phone')}
                                    className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                                >
                                    تغيير رقم الهاتف
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* View: Registration Wizard (Same as before) */}
                    {view === 'register' && (
                        <motion.div
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-lg"
                        >
                            <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">إكمال التسجيل</h2>
                                    <p className="text-slate-500 text-sm">خطوة {step} من 3</p>
                                </div>
                                <button onClick={handleBack} className="text-sm text-slate-400 hover:text-slate-600">
                                    {step === 1 ? 'إلغاء' : 'سابق'}
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl p-1 mb-6 min-h-[400px]">
                                {renderStep()}
                            </div>

                            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

                            <div className="flex gap-4">
                                {step < 3 ? (
                                    <button onClick={handleNext} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                                        متابعة
                                    </button>
                                ) : (
                                    <button onClick={handleRegister} disabled={loading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-70">
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
