// src/components/layout/Header.jsx - Enhanced header with compact scroll mode and mobile optimization
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
import appLogo from '../../assets/IMG_1787.jpg';

const Header = ({ children }) => {
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext();
    const { openModal } = useModal();
    const { getCartItemCount } = useCart();
    const { searchTerm, handleSearchTermChange, clearSearch } = useSearch();

    const [addressFormData, setAddressFormData] = useState({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);
    const [isChangingCity, setIsChangingCity] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // New: compact header state
    const [isCompact, setIsCompact] = useState(false);

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => {
            setIsCompact(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Telegram Web App integration
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            tg.setHeaderColor('#ffffff');
            tg.setBackgroundColor('#f8fafc');
            tg.enableClosingConfirmation();

            if (getCartItemCount() > 0) {
                
              
                tg.onEvent('mainButtonClicked', () => {
                    openModal('cart');
                    tg.HapticFeedback.impactOccurred('medium');
                });
            } else {
                tg.MainButton.hide();
            }

            tg.BackButton.onClick(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    tg.close();
                }
            });
        }
    }, [getCartItemCount, openModal]);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            const cartCount = getCartItemCount();
            if (cartCount > 0) {
                tg.MainButton.setText(`🛒 عرض السلة (${cartCount})`);
               
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
            formData,
            onFormChange: handleAddressFormChange,
            onFormSubmit: handleSaveProfileFromModal,
            error: profileError,
            isSaving: isSavingProfile
        });

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
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
        } catch (error) {
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
        } catch {
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
        if (!searchTerm) setIsSearchExpanded(false);
    };

    const cartItemCount = getCartItemCount();

    return (
        <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all duration-300 ${isCompact ? 'py-1' : 'py-3'}`}
        >
            <div className={`px-4 max-w-4xl mx-auto transition-all duration-300`}>
                
                {/* Top row */}
                <div className={`flex items-center justify-between ${isCompact ? 'mb-2' : 'mb-4'}`}>
                   
 <motion.div 
                        className="flex items-center gap-2 flex-shrink-0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <img 
                            src={appLogo} 
                            alt="App Logo" 
                            className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-blue-100" // Set to w-8 h-8
                        />
                        <span 
                            className="text-lg font-bold text-blue-700 whitespace-nowrap italic font-app-logo-text"
                        >
                            طبيب
                        </span>
                    </motion.div>

                   
                   {/* Right actions */}
<div className="flex items-center gap-1 sm:gap-2">
     {/* City selector - Now styled like other icons */}
                      <div className="relative z-20"> {/* New wrapper for consistent popover positioning */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsCityPopoverOpen(prev => !prev)}
                                disabled={isChangingCity}
                                // Applied styling similar to Notification/Search/Profile icons
                                className="relative flex items-center gap-1 p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-100 disabled:opacity-70 flex-shrink-0"
                            >
                                {isChangingCity ? (
                                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                ) : (
                                    <MapPin className="h-4 w-4 text-gray-600" />
                                )}
                                {/* Text content for city, adapted for compactness */}
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                    {/* Conditional rendering of 'المدينة' label for smaller screens */}
                                    {(!isCompact || window.innerWidth > 640) && (
                                        <span className="text-[9px] text-gray-500 leading-none">المدينة</span>
                                    )}
                                    <span className="truncate text-xs font-semibold text-gray-700 leading-none">
                                        {isChangingCity ? 'جاري التغيير...' : (userProfile?.selected_city_name || 'اختر مدينة')}
                                    </span>
                                </div>
                                <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            </motion.button>
                            <AnimatePresence>
                                {isCityPopoverOpen && (
                                    <CityChangePopover
                                        currentCityId={userProfile?.selected_city_id}
                                        onCitySelect={handleCityChange}
                                        onClose={() => setIsCityPopoverOpen(false)}
                                        // Position the popover relative to its parent `div.relative.z-20`
                                        // `w-max` allows it to size according to its content, `left-1/2 -translate-x-1/2` centers it
                                        className="absolute z-30 mt-2 w-max left-1/2 -translate-x-1/2 min-w-[150px]" 
                                    />
                                )}
                            </AnimatePresence>
                        </div>

    {/* Notifications */}
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
        title="الإشعارات"
    >
        <Bell className="h-4 w-4" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-md">
            3
        </span>
    </motion.button>

    {/* Compact mode search icon */}
    {isCompact && !isSearchExpanded && (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSearchExpanded(true)}
            className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
        >
            <Search className="h-4 w-4 text-gray-500" />
        </motion.button>
    )}

    {/* Profile */}
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
    </motion.div>
</div>
                </div>

                {/* Search bar row */}
{(!isCompact || isSearchExpanded) && (
    <div className="relative mt-2">
        <motion.div 
            className="relative"
            animate={{ 
                boxShadow: isSearchFocused ? '0 8px 30px rgba(59, 130, 246, 0.12)' : '0 2px 10px rgba(0, 0, 0, 0.05)' 
            }}
            transition={{ duration: 0.3 }}
        >
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
            <motion.input
                type="text"
                placeholder="ابحث..."
                value={searchTerm}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full pl-4 pr-12 py-3 border-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300 text-sm placeholder-gray-500"
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
    </div>
)}

                {children}
            </div>
        </motion.header>
    );
};

export default Header;
