// src/AppInitializer.jsx - Enhanced with caching and better loading states, Telegram-inspired design, Arabic quotes
import React, { useEffect, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // Import AnimatePresence
import { userService } from './services/userService';
import CitySelectionModal from './components/modals/CitySelectionModal';
import { SearchProvider } from './context/SearchContext';
import { CartProvider } from './context/CartContext'; // Corrected path (assuming CartContext.jsx)
import { FilterProvider } from './context/FilterContext';
import { CheckoutProvider } from './context/CheckoutContext'; // Corrected path (assuming CheckoutContext.jsx)
import { MiniCartProvider } from './context/MiniCartContext';
import { CacheProvider } from './context/CacheContext';
import { Building, Loader2, XCircle } from 'lucide-react'; // Assuming lucide-react is installed

// Famous Dentist Quotes in Arabic
const dentistQuotes = [
    {
        quote: "كل سن في رأس الرجل أثمن من الماس.",
        author: "ميغيل دي ثيربانتس"
    },
    {
        quote: "صحة الفم هي نافذة على صحتك العامة.",
        author: "سي. إيفرت كوب"
    },
    {
        quote: "الابتسامة هي انحناءة تجعل كل شيء مستقيمًا.",
        author: "فيليس ديلر"
    },
    {
        quote: "الفم هو بوابة الجسم.",
        author: "مجهول"
    },
    {
        quote: "أسنان صحية، جسم سليم.",
        author: "مثل شعبي"
    },
    {
        quote: "الوقاية خير من العلاج، خاصة في طب الأسنان.",
        author: "مقولة شائعة"
    }
];

const AppInitializer = () => {
    const [telegramUser, setTelegramUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initializationStep, setInitializationStep] = useState('تهيئة التطبيق...');
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0); // State for current quote

    const fetchUserProfile = useCallback(async () => {
        try {
            setInitializationStep('تحميل ملفك الشخصي...');
            const profileData = await userService.getProfile();
            setUserProfile(profileData);
        } catch (err) {
            if (err.status === 404) {
                setUserProfile({ selected_city_id: null }); 
            } else {
                console.error("Profile fetch error:", err);
                setError('Could not load your profile. Please try refreshing.');
            }
        } finally {
            // For demonstration, simulating a minimum load time. 
            // This ensures the quotes have some time to animate.
            setTimeout(() => setIsLoading(false), 3000); // Increased timeout to see quotes
        }
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            setInitializationStep('الاتصال بتيليجرام...');
            
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                
                tg.setHeaderColor('#ffffff');
                tg.setBackgroundColor('#f8fafc');
                
                tg.enableClosingConfirmation();
                tg.HapticFeedback.impactOccurred('light');
                
                console.log('✅ Enhanced Telegram Web App initialized');
            }
            
            document.body.style.overflow = 'auto';
            
            const user = tg?.initDataUnsafe?.user || { 
                id: 123456789, 
                first_name: 'Local', 
                last_name: 'Dev',
                username: 'localdev'
            };
            setTelegramUser(user);
            
            await fetchUserProfile();
        };

        initializeApp();
    }, [fetchUserProfile]);

    // Effect to rotate quotes
    useEffect(() => {
        if (isLoading) {
            const quoteInterval = setInterval(() => {
                setCurrentQuoteIndex(prevIndex => 
                    (prevIndex + 1) % dentistQuotes.length
                );
            }, 5000); // Change quote every 5 seconds (adjust as needed)

            return () => clearInterval(quoteInterval); // Cleanup interval on unmount or when loading stops
        }
    }, [isLoading]);

    const handleCitySelect = async ({ cityId }) => {
        try {
            setInitializationStep('حفظ اختيار المدينة...');
            const updatedProfile = await userService.updateProfile({ selected_city_id: cityId });
            setUserProfile(updatedProfile);
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
        } catch (err) {
            console.error(err);
            setError("Could not save your city selection. Please try again.");
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error'); 
        }
    };

    if (isLoading) {
        // Framer Motion variants for staggered animations
        const containerVariants = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: {
                    when: "beforeChildren",
                    staggerChildren: 0.15 
                }
            }
        };

        const itemVariants = {
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
        };

        const quoteVariants = {
            enter: { opacity: 0, y: 10 }, // Start slightly below and invisible
            center: { opacity: 1, y: 0 }, // Fully visible at natural position
            exit: { opacity: 0, y: -10 }, // Exit by moving slightly up and fading out
        };

        const currentQuote = dentistQuotes[currentQuoteIndex];

        return (
            <div className="flex items-center justify-center min-h-screen bg-white text-gray-800 font-sans">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-center p-8 max-w-sm w-full bg-white rounded-xl shadow-lg"
                >
                    {/* Logo Placeholder Section */}
                    <motion.div
                        variants={itemVariants}
                        className="mb-8"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, rotate: -30 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                            className="w-24 h-24 rounded-full bg-blue-500 mx-auto flex items-center justify-center shadow-md"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="text-white text-5xl font-extrabold"
                            >
                                <Building className="w-12 h-12 text-white" /> 
                            </motion.div>
                        </motion.div>
                        <p className="mt-2 text-xs text-gray-500">Your Logo Here</p>
                    </motion.div>
                    
                    {/* Application Title */}
                    <motion.h1 
                        variants={itemVariants}
                        className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-800"
                    >
                        معرض المستلزمات الطبية
                    </motion.h1>
                    
                    {/* Initialization Step Message */}
                    <motion.div
                        variants={itemVariants}
                        className="flex items-center justify-center gap-3 text-gray-600 mb-6"
                    >
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Loader2 className="h-5 w-5 text-blue-500" />
                        </motion.span>
                        <span className="text-base">{initializationStep}</span>
                    </motion.div>
                    
                    {/* Rotating Quotes Section - Now in Arabic */}
                    <motion.div
                        variants={itemVariants} // Apply parent animation
                        className="w-full h-20 flex flex-col justify-center items-center overflow-hidden mb-4" // Fixed height for smooth transitions
                        dir="rtl" // Set text direction to Right-to-Left for Arabic
                    >
                        <AnimatePresence mode="wait"> 
                            <motion.div
                                key={currentQuote.quote} // Crucial: key changes to trigger exit/enter animations
                                variants={quoteVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="text-center"
                            >
                                <p className="text-sm italic text-gray-700 leading-relaxed mb-1">
                                    "{currentQuote.quote}"
                                </p>
                                <p className="text-xs font-semibold text-blue-500">
                                    - {currentQuote.author}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Additional reassuring message */}
                    <motion.p
                        variants={itemVariants}
                        className="mt-4 text-sm text-gray-500"
                    >
                        الرجاء الانتظار قليلاً...
                    </motion.p>
                </motion.div>
            </div>
        );
    }

    // Error state display (kept as is)
    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="p-4 bg-red-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
                    <p className="text-gray-300 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        إعادة المحاولة
                    </button>
                </motion.div>
            </div>
        );
    }

    // City selection modal if no city is selected
    if (userProfile && !userProfile.selected_city_id) {
        return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />;
    }
    
    // Main app content wrapped in contexts
    return (
        <CacheProvider>
            <MiniCartProvider>  
                <CartProvider user={telegramUser}>
                    <SearchProvider cityId={userProfile?.selected_city_id}>
                        <FilterProvider>
                            <CheckoutProvider>
                                <Outlet context={{ telegramUser, userProfile, onProfileUpdate: fetchUserProfile }} />
                            </CheckoutProvider>
                        </FilterProvider>
                    </SearchProvider>
                </CartProvider>
            </MiniCartProvider>
        </CacheProvider>
    );
};

export default AppInitializer;