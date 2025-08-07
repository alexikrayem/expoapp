// src/components/layout/Header.jsx - Enhanced header with better UI and Telegram integration
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { userService } from '../../services/userService';

import { ShoppingCart, Search, X, MapPin, Loader2, User, Bell, ChevronDown } from 'lucide-react';
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
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // Telegram Web App integration
    useEffect(() => {
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
            
            // Configure main button for cart
            if (getCartItemCount() > 0) {
                tg.MainButton.setText(`🛒 عرض السلة (${getCartItemCount()})`);
                tg.MainButton.color = '#3b82f6';
                tg.MainButton.textColor = '#ffffff';
                tg.MainButton.show();
                
                tg.onEvent('mainButtonClicked', () => {
                    openModal('cart');
                    tg.HapticFeedback.impactOccurred('medium');
                });
            } else {
                tg.MainButton.hide();
            }
            
            // Configure back button behavior
            tg.BackButton.onClick(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    tg.close();
                }
            });
            
            console.log('✅ Enhanced Telegram Web App integration initialized');
        }
    }, [getCartItemCount, openModal]);

    // Update main button when cart changes
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            const cartCount = getCartItemCount();
            if (cartCount > 0) {
                tg.MainButton.setText(`🛒 عرض السلة (${cartCount})`);
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }
        }
    }, [getCartItemCount]);

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

        // Haptic feedback
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
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

    const handleSearchFocus = () => {
        setIsSearchFocused(true);
        setIsSearchExpanded(true);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    const handleSearchBlur = () => {
        setIsSearchFocused(false);
        if (!searchTerm) {
            setIsSearchExpanded(false);
        }
    };

    const cartItemCount = getCartItemCount();

    return (
        <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm"
        >
            <div className="px-4 py-3 max-w-4xl mx-auto">
                {/* Top row with enhanced design */}
                <div className="flex items-center justify-between mb-4">
                    {/* City selector with enhanced UI */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsCityPopoverOpen(prev => !prev)}
                            disabled={isChangingCity}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 p-3 rounded-xl transition-all duration-200 max-w-[140px] disabled:opacity-70 disabled:cursor-wait shadow-sm border border-blue-100"
                            title="تغيير المدينة"
                        >
                            {isChangingCity ? (
                                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            ) : (
                                <MapPin className="h-4 w-4 text-blue-500" />
                            )}
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-xs text-gray-500 leading-none">المدينة</span>
                                <span className="truncate text-xs font-semibold text-gray-700">
                                    {isChangingCity ? 'جاري التغيير...' : (userProfile?.selected_city_name || 'اختر مدينة')}
                                </span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                        </motion.button>
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

                    {/* App title with gradient */}
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 text-center"
                    >
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            معرض المستلزمات
                        </h1>
                        <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 mx-auto mt-1 rounded-full"></div>
                    </motion.div>

                    {/* Right actions with enhanced design */}
                    <div className="flex items-center gap-2">
                        {/* Notifications button (placeholder for future) */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
                            title="الإشعارات"
                        >
                            <Bell className="h-4 w-4" />
                            {/* Notification badge placeholder */}
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-md">
                                3
                            </span>
                        </motion.button>

                        {/* Cart button with enhanced badge */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenCart}
                            className="relative p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 shadow-sm border border-blue-100"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            {cartItemCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md"
                                >
                                    {cartItemCount > 99 ? '99+' : cartItemCount}
                                </motion.span>
                            )}
                        </motion.button>

                        {/* Profile button with enhanced design */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
                        </motion.div>
                    </div>
                </div>
                
                {/* Enhanced search bar with morphing animation */}
                <motion.div 
                    className="relative"
                    animate={{ 
                        boxShadow: isSearchFocused ? '0 8px 30px rgba(59, 130, 246, 0.12)' : '0 2px 10px rgba(0, 0, 0, 0.05)' 
                    }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div 
                        className="relative"
                        animate={{
                            borderRadius: isSearchExpanded ? '16px' : '20px',
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                        <motion.input
                            type="text"
                            placeholder="ابحث عن منتجات, عروض, أو موردين..."
                            value={searchTerm}
                            onChange={(e) => handleSearchTermChange(e.target.value)}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            className="w-full pl-4 pr-12 py-4 border-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:from-white focus:to-white transition-all duration-300 text-sm placeholder-gray-500"
                            animate={{
                                paddingTop: isSearchExpanded ? '16px' : '16px',
                                paddingBottom: isSearchExpanded ? '16px' : '16px',
                            }}
                        />
                        <AnimatePresence>
                            {searchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                                    onClick={clearSearch}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.div>
                    
                    {/* Search suggestions or recent searches could go here */}
                    <AnimatePresence>
                        {isSearchFocused && !searchTerm && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-20"
                            >
                                <p className="text-sm text-gray-500 mb-2">عمليات بحث شائعة:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['أدوية', 'مستلزمات طبية', 'أجهزة', 'مكملات'].map(term => (
                                        <button
                                            key={term}
                                            onClick={() => handleSearchTermChange(term)}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {children}
            </div>
        </motion.header>
    );
};

export default Header;