import React, { useEffect } from 'react';
import TelegramLoginWidget from '../components/TelegramLoginWidget';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigate = useNavigate();

    const handleLoginSuccess = (user) => {
        console.log("Login successful:", user);

        // Mobile App Handoff
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'telegram_auth',
                user: user
            }));
        } else {
            // Web App Navigation
            navigate('/');
        }
    };

    const handleLoginError = (error) => {
        console.error('Login failed:', error);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-panel w-full max-w-md p-8 md:p-12 flex flex-col items-center text-center z-10"
            >
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span className="text-4xl">🔐</span>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">تسجيل الدخول</h2>
                <p className="text-white/80 mb-8">
                    الرجاء تسجيل الدخول باستخدام حساب تيليجرام للمتابعة
                </p>

                <div className="w-full flex justify-center mb-8 bg-white/30 p-4 rounded-xl backdrop-blur-sm">
                    <div className="w-full flex justify-center mb-8 bg-white/30 p-4 rounded-xl backdrop-blur-sm">
                        <TelegramLoginWidget
                            onLoginSuccess={handleLoginSuccess}
                            onError={handleLoginError}
                        />
                    </div>
                </div>

                <p className="text-white/60 text-xs">
                    بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بنا.
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
