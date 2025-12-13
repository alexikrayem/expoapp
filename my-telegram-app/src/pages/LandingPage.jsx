import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, MessageCircle, ChevronLeft } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: Search,
            title: 'بحث متقدم',
            description: 'ابحث عن المنتجات والموردين وأحدث العروض بسهولة تامة مع خيارات تصفية دقيقة.'
        },
        {
            icon: ShoppingCart,
            title: 'إدارة الطلبات',
            description: 'نظام متكامل لإدارة سلة المشتريات وتتبع طلباتك من مكان واحد.'
        },
        {
            icon: MessageCircle,
            title: 'تواصل مباشر',
            description: 'تواصل مباشرة مع الموردين وأصحاب العروض للاستفسار والاتفاق.'
        }
    ];

    return (
        <div className="min-h-screen flex flex-col font-['Inter',_sans-serif] bg-white text-slate-900" dir="rtl">

            {/* Header / Nav Mock */}
            <header className="w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🩺</span>
                    <span className="font-bold text-lg tracking-tight">Medical Expo</span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                >
                    تسجيل الدخول
                </button>
            </header>

            {/* Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-4 mt-10 md:mt-20 mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-blue-50 border border-blue-100/50">
                        <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">المنصة الأولى للمستلزمات الطبية</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 tracking-tight leading-[1.1]">
                        كل ماتحتاجه عيادتك <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">في مكان واحد</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
                        منصتك الأولى لاكتشاف أحدث المنتجات الطبية، التواصل مع الموردين، وإتمام الصفقات بكل سهولة وأمان.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/login')}
                        className="group relative px-8 py-4 bg-blue-600 text-white font-semibold text-lg rounded-full shadow-[0_10px_20px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all"
                    >
                        <span className="flex items-center justify-center gap-2">
                            ابدأ التصفح الآن
                            <ChevronLeft className="w-5 h-5" />
                        </span>
                    </motion.button>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl px-4 mt-24">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
                            className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:border-blue-100 hover:shadow-[0_10px_30px_-15px_rgba(0,0,255,0.1)] transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto text-blue-600">
                                <feature.icon size={28} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* Footer Copyright */}
            <footer className="w-full text-center py-8 text-slate-400 text-sm border-t border-slate-100 mt-auto">
                &copy; {new Date().getFullYear()} Medical Expo. جميع الحقوق محفوظة.
            </footer>
        </div>
    );
};

export default LandingPage;
