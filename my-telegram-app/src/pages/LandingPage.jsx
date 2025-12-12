import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, MessageCircle, ChevronLeft } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: Search,
            title: 'بحث متقدم وشامل',
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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">

            {/* Hero Section */}
            <main className="w-full max-w-6xl mx-auto z-10 flex flex-col items-center justify-center text-center mt-12 mb-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="glass-panel p-8 md:p-16 mb-12 max-w-4xl w-full"
                >
                    <div className="w-32 h-32 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <span className="text-6xl">🩺</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-md">
                        معرض المستلزمات الطبية
                    </h1>

                    <p className="text-lg md:text-2xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
                        منصتك الأولى لاكتشاف أحدث المنتجات الطبية، التواصل مع الموردين، وإتمام الصفقات بكل سهولة وأمان.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/login')}
                        className="group relative px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full shadow-lg overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            ابدأ الآن
                            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
                            className="glass-card p-6 text-center text-white flex flex-col items-center"
                        >
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-white">
                                <feature.icon size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-white/80 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* Footer Copyright */}
            <footer className="w-full text-center py-6 text-white/60 text-sm z-10">
                &copy; {new Date().getFullYear()} Medical Expo. جميع الحقوق محفوظة.
            </footer>
        </div>
    );
};

export default LandingPage;
