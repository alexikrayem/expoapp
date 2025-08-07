// src/AppInitializer.jsx - Enhanced with caching and better loading states
import React, { useEffect, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userService } from './services/userService';
import CitySelectionModal from './components/modals/CitySelectionModal';
import { SearchProvider } from './context/SearchContext';
import { CartProvider } from './context/CartContext';
import { FilterProvider } from './context/FilterContext';
import { CheckoutProvider } from './context/CheckoutContext';
import { MiniCartProvider } from './context/MiniCartContext';
import { CacheProvider } from './context/CacheContext';
import { Building, Loader2 } from 'lucide-react';

const AppInitializer = () => {
    const [telegramUser, setTelegramUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initializationStep, setInitializationStep] = useState('تهيئة التطبيق...');

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
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            // Enhanced Telegram Web App initialization
            setInitializationStep('الاتصال بتيليجرام...');
            
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
                
                // Enhanced theme configuration
                tg.setHeaderColor('#ffffff');
                tg.setBackgroundColor('#f8fafc');
                
                // Configure viewport for better mobile experience
                tg.viewportHeight = window.innerHeight;
                tg.viewportStableHeight = window.innerHeight;
                
                // Enable closing confirmation
                tg.enableClosingConfirmation();
                
                // Configure haptic feedback
                tg.HapticFeedback.impactOccurred('light');
                
                console.log('✅ Enhanced Telegram Web App initialized');
            }
            
            // Ensure scrolling is enabled
            document.body.style.overflow = 'auto';
            
            // Get user data with fallback for development
            const user = tg?.initDataUnsafe?.user || { 
                id: 123456789, 
                first_name: 'Local', 
                last_name: 'Dev',
                username: 'localdev'
            };
            setTelegramUser(user);
            
            // Fetch user profile
            await fetchUserProfile();
        };

        initializeApp();
    }, [fetchUserProfile]);

    const handleCitySelect = async ({ cityId }) => {
        try {
            setInitializationStep('حفظ اختيار المدينة...');
            const updatedProfile = await userService.updateProfile({ selected_city_id: cityId });
            setUserProfile(updatedProfile);
            
            // Haptic feedback for successful city selection
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
        } catch (err) {
            console.error(err);
            setError("Could not save your city selection. Please try again.");
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        }
    };

    // Enhanced loading screen
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center p-8"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="mb-6"
                    >
                        <div className="p-4 bg-white rounded-full shadow-lg">
                            <Building className="h-12 w-12 text-blue-500" />
                        </div>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold text-gray-800 mb-2"
                    >
                        معرض المستلزمات الطبية
                    </motion.h1>
                    
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-2 text-gray-600"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{initializationStep}</span>
                    </motion.div>
                    
                    {/* Loading progress bar */}
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="mt-6 h-1 bg-blue-500 rounded-full mx-auto max-w-xs"
                    />
                </motion.div>
            </div>
        );
    }

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
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        إعادة المحاولة
                    </button>
                </motion.div>
            </div>
        );
    }

    if (userProfile && !userProfile.selected_city_id) {
        return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />;
    }
    
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