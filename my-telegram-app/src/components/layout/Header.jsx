// src/components/layout/Header.jsx - Enhanced header with better UI
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { userService } from '../../services/userService';

import { ShoppingCart, Search, X, MapPin, Loader2, User, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ProfileIcon from '../common/ProfileIcon';
import CityChangePopover from '../common/CityChangePopover';

const Header = ({ children }) => {
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext();
    const { openModal } = useModal();
    const { getCartItemCount } = useCart();
    const { searchTerm, handleSearchTermChange, clearSearch } = useSearch();

    // Profile modal state
    const [addressFormData, setAddressFormData] = useState({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState(null);
    
    // City popover state
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);
    const [isChangingCity, setIsChangingCity] = useState(false);
    
    // Search state
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Telegram Web App integration
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            
            // Set theme colors
            tg.setHeaderColor('#ffffff');
            tg.setBackgroundColor('#f9fafb');
            
            // Configure viewport
            tg.viewportHeight = window.innerHeight;
            tg.viewportStableHeight = window.innerHeight;
            
            // Enable haptic feedback
            tg.HapticFeedback.impactOccurred('light');
            
            console.log('✅ Telegram Web App initialized for customer app');
        }
    }, []);

    const handleOpenProfileModal = () => {
        const formData = {
            fullName: userProfile?.full_name || `${telegramUser?.first_name || ''} ${telegramUser?.last_name || ''}`.trim(),
            phoneNumber: userProfile?.phone_number || '',
            addressLine1: userProfile?.address_line1 || '',
            addressLine2: userProfile?.address_line2 || '',
            city: userProfile?.city || userProfile?.selected_city_name || '',
        };
        setAddressFormData(formData);
        setProfileError(null);

        openModal('profile', {
            formData: formData,
            onFormChange: handleAddressFormChange,
            onFormSubmit: handleSaveProfileFromModal,
            error: profileError,
            isSaving: isSavingProfile
        });
    };

    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfileFromModal = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileError(null);
        try {
            await userService.updateProfile(addressFormData);
            onProfileUpdate();
            openModal(null);
            
            // Telegram haptic feedback
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Error saving profile:", error);
            setProfileError(error.message || "Failed to save profile.");
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleOpenCart = () => {
        openModal('cart');
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    };

    const handleCityChange = async (city) => {
        if (!city || isChangingCity) return;
        setIsChangingCity(true);
        setIsCityPopoverOpen(false);
        try {
            await userService.updateProfile({ selected_city_id: city.id });
            onProfileUpdate();
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
        } catch (err) {
            console.error("Failed to change city:", err);
            alert("فشل تغيير المدينة.");
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsChangingCity(false);
        }
    };

    const cartItemCount = getCartItemCount();

    return (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100">
            <div className="px-4 py-3 max-w-4xl mx-auto">
                {/* Top row with city, title, and actions */}
                <div className="flex items-center justify-between mb-4">
                    {/* City selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsCityPopoverOpen(prev => !prev)}
                            disabled={isChangingCity}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-all duration-200 max-w-[140px] disabled:opacity-70 disabled:cursor-wait shadow-sm"
                            title="تغيير المدينة"
                        >
                            {isChangingCity ? (
                                <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
                            ) : (
                                <MapPin className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="truncate text-xs">
                                {isChangingCity ? 'جاري التغيير...' : (userProfile?.selected_city_name || 'اختر مدينة')}
                            </span>
                        </button>
                        <AnimatePresence>
                            {isCityPopoverOpen && (
                                <CityChangePopover
                                    currentCityId={userProfile?.selected_city_id}
                                    onCitySelect={handleCityChange}
                                    onClose={() => setIsCityPopoverOpen(false)}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* App title */}
                    <motion.h1 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-bold text-gray-800 absolute left-1/2 -translate-x-1/2"
                    >
                        معرض المستلزمات
                    </motion.h1>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {/* Cart button with badge */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenCart}
                            className="relative p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {cartItemCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md"
                                >
                                    {cartItemCount > 99 ? '99+' : cartItemCount}
                                </motion.span>
                            )}
                        </motion.button>

                        {/* Profile button */}
                        <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
                    </div>
                </div>
                
                {/* Enhanced search bar */}
                <motion.div 
                    className="relative"
                    animate={{ 
                        boxShadow: isSearchFocused ? '0 4px 20px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)' 
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ابحث عن منتجات, عروض, أو موردين..."
                            value={searchTerm}
                            onChange={(e) => handleSearchTermChange(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            className="w-full pl-4 pr-12 py-3 border border-gray-200 bg-gray-50/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent focus:bg-white transition-all duration-200 text-sm"
                        />
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={clearSearch}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                >
                                    <X className="h-4 w-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {children}
            </div>
        </header>
    );
};

export default Header;