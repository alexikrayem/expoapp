
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
    {
        id: 1,
        image: "/assets/onboarding/slide1.png",
        title: "مستقبل الرعاية الصحية",
        subtitle: "تصفح أحدث المستلزمات الطبية من أرقى الماركات العالمية"
    },
    {
        id: 2,
        image: "/assets/onboarding/slide2.png",
        title: "تواصل مباشر وفعال",
        subtitle: "شبكة واسعة من الموردين الموثوقين في مكان واحد"
    },
    {
        id: 3,
        image: "/assets/onboarding/slide3.png",
        title: "إدارة طلبات ذكية",
        subtitle: "نظام متكامل لمتابعة مشترياتك وعروض الأسعار"
    }
];

export default function LoginCarousel() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, 6000); // Slower, more elegant rotation
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-full w-full flex flex-col justify-center items-center relative p-12">
            {/* Subtle Grid Background (Optional for texture) */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
            </div>

            <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Apple-style easing
                        className="flex flex-col items-center text-center"
                    >
                        {/* Clean Image Container */}
                        <div className="relative mb-12 w-full aspect-square flex items-center justify-center">
                            <div className="absolute inset-4 bg-gradient-to-tr from-blue-100/50 to-white/50 rounded-full blur-2xl opacity-60" />
                            <img
                                src={slides[index].image}
                                alt={slides[index].title}
                                className="relative w-full h-full object-contain filter drop-shadow-xl"
                            />
                        </div>

                        {/* Typography */}
                        <motion.h2
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-2xl font-semibold text-slate-800 mb-4 tracking-tight"
                        >
                            {slides[index].title}
                        </motion.h2>

                        <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-slate-500 leading-relaxed max-w-xs mx-auto text-sm"
                        >
                            {slides[index].subtitle}
                        </motion.p>
                    </motion.div>
                </AnimatePresence>

                {/* Minimal Indicators */}
                <div className="flex gap-3 mt-16">
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            className={`h - 1.5 rounded - full transition - all duration - 700 ${i === index ? "w-8 bg-blue-600" : "w-1.5 bg-slate-200"
                                } `}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}