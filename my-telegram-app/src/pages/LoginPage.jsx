import React, { useEffect } from 'react';
import TelegramLoginWidget from '../components/TelegramLoginWidget';
import LoginCarousel from '../components/LoginCarousel';
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
        <div className="min-h-screen flex bg-white font-[Montaserat]" dir="rtl">

            {/* Left Side - Visual Carousel (Desktop Only) */}
            <div className="hidden lg:block w-1/2 bg-slate-50 relative overflow-hidden">
                <LoginCarousel />
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">

                {/* Mobile Background Elements (only visible when carousel is hidden) */}
                <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -right-[10%] w-[80vw] h-[80vw] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                    <div className="absolute top-[20%] -left-[10%] w-[80vw] h-[80vw] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-md flex flex-col items-center text-center z-10"
                >
                    {/* Header Group */}
                    <div className="mb-10 text-center">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                            <span className="text-4xl filter drop-shadow">🔐</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">تسجيل الدخول</h1>
                        <p className="text-slate-500 text-lg">أهلاً بك! ابدأ رحلتك معنا اليوم</p>
                    </div>

                    {/* Telegram Widget Container */}
                    <div className="w-full bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8 relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative flex flex-col items-center">
                            <p className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">باستخدام تيليجرام</p>
                            <TelegramLoginWidget
                                onLoginSuccess={handleLoginSuccess}
                                onError={handleLoginError}
                            />
                        </div>
                    </div>

                    {/* Footer / Trust Signals */}
                    <div className="flex items-center justify-center gap-6 text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-green-500">🛡️</span>
                            <span>آمن ومشفّر</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                        <div className="flex items-center gap-2">
                            <span className="text-blue-500">⚡</span>
                            <span>سريع وسهل</span>
                        </div>
                    </div>

                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
