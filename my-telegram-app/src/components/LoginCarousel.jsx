
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
    {
        id: 1,
        image: "/assets/onboarding/slide1.png",
        title: "مستقبل الرعاية الصحية",
        subtitle: "تصفح أحدث المستلزمات الطبية من أرقى الماركات العالمية",
        bg: "bg-blue-50"
    },
    {
        id: 2,
        image: "/assets/onboarding/slide2.png",
        title: "تواصل مباشر وفعال",
        subtitle: "شبكة واسعة من الموردين الموثوقين في مكان واحد",
        bg: "bg-indigo-50"
    },
    {
        id: 3,
        image: "/assets/onboarding/slide3.png",
        title: "إدارة طلبات ذكية",
        subtitle: "نظام متكامل لمتابعة مشترياتك وعروض الأسعار",
        bg: "bg-purple-50"
    }
];

export default function LoginCarousel() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center p-8 bg-slate-50">

            {/* Abstract Background Shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
            </div>

            {/* Main Content Carousel */}
            <div className="relative z-10 w-full max-w-lg h-[600px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="flex flex-col items-center text-center"
                    >
                        {/* Image Container with organic shape */}
                        <div className="relative w-80 h-80 mb-12">
                            <div className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl shadow-blue-500/10 rotate-3 transform transition-transform duration-1000" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-white rounded-[2rem] shadow-lg overflow-hidden flex items-center justify-center -rotate-3 transform transition-transform duration-1000">
                                <img
                                    src={slides[index].image}
                                    alt={slides[index].title}
                                    className="w-[90%] h-[90%] object-contain drop-shadow-md"
                                />
                            </div>
                        </div>

                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl font-bold text-slate-800 mb-4 tracking-tight leading-tight"
                        >
                            {slides[index].title}
                        </motion.h2>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg text-slate-500 max-w-xs leading-relaxed"
                        >
                            {slides[index].subtitle}
                        </motion.p>
                    </motion.div>
                </AnimatePresence>

                {/* Progress Indicators */}
                <div className="flex gap-2 justify-center mt-12">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-500 ease-in-out ${i === index ? "w-8 bg-blue-600" : "w-2 bg-slate-300"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
