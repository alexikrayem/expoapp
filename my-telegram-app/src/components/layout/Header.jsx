// src/components/layout/Header.jsx (FINAL VERSION)
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { userService } from '../../services/userService';

import { ShoppingCart, Search, X, MapPin, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ProfileIcon from '../common/ProfileIcon';
import CityChangePopover from '../common/CityChangePopover';

const Header = ({ children }) => {
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext();
    const { openModal } = useModal();
    const { cartItems } = useCart();
    const { searchTerm, handleSearchTermChange, clearSearch } = useSearch();

    // --- STATE FOR PROFILE MODAL ---
    const [addressFormData, setAddressFormData] = useState({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState(null);
    
    // --- STATE FOR CITY POPOVER ---
    const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false);
    const [isChangingCity, setIsChangingCity] = useState(false);
    
    const handleOpenProfileModal = () => {
        // Prepare the formData object from the latest profile data.
        const formData = {
            fullName: userProfile?.full_name || `${telegramUser?.first_name || ''} ${telegramUser?.last_name || ''}`.trim(),
            phoneNumber: userProfile?.phone_number || '',
            addressLine1: userProfile?.address_line1 || '',
            addressLine2: userProfile?.address_line2 || '',
            city: userProfile?.city || userProfile?.selected_city_name || '',
        };
        setAddressFormData(formData); // Set the state
        setProfileError(null); // Clear any old errors

        openModal('profile', {
            formData: formData, // Pass the prepared data
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
            onProfileUpdate(); // Trigger a refetch of the profile data
            openModal(null);   // Close the modal on success
        } catch (error) {
            console.error("Error saving profile:", error);
            setProfileError(error.message || "Failed to save profile.");
        } finally {
            setIsSavingProfile(false);
        }
    };

 const handleOpenCart = () => {
    openModal('cart', { 

    });
};

    const handleCityChange = async (city) => {
        if (!city || isChangingCity) return;
        setIsChangingCity(true);
        setIsCityPopoverOpen(false);
        try {
            await userService.updateProfile({ selected_city_id: city.id });
            onProfileUpdate();
        } catch (err) {
            console.error("Failed to change city:", err);
            alert("فشل تغيير المدينة.");
        } finally {
            setIsChangingCity(false);
        }
    };

    // This effect ensures the modal re-renders with the latest error or saving state
    useEffect(() => {
        // Find out if the profile modal is the one currently open
        // We can do this by checking a unique prop, like onFormSubmit
        const modalIsOpenAndIsProfileModal = document.querySelector('.bg-white.rounded-xl form'); // A bit hacky, better check needed if more forms exist
        
        if (modalIsOpenAndIsProfileModal) {
            handleOpenProfileModal();
        }
    }, [isSavingProfile, profileError]);


    return (
        <header className="sticky top-0 z-30 shadow-sm bg-white/90 backdrop-blur-lg">
            <div className="p-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setIsCityPopoverOpen(prev => !prev)}
                                disabled={isChangingCity}
                                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors max-w-[160px] disabled:opacity-70 disabled:cursor-wait"
                                title="Change City"
                            >
                                {isChangingCity ? <Loader2 className="h-5 w-5 text-gray-500 animate-spin" /> : <MapPin className="h-5 w-5 text-gray-500" />}
                                <span className="truncate">
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
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 absolute left-1/2 -translate-x-1/2 hidden sm:block">
                        معرض المستلزمات
                    </h1>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {cartItems && cartItems.length > 0 && (
                            <button onClick={handleOpenCart} className="relative p-2 text-gray-600 hover:text-blue-600">
                                <ShoppingCart className="h-6 w-6" />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                                </span>
                            </button>
                        )}
                        <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
                    </div>
                </div>
                
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="ابحث عن منتجات, عروض, أو موردين..."
                        value={searchTerm}
                        onChange={(e) => handleSearchTermChange(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {searchTerm && (
                        <button onClick={clearSearch} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-500">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {children}
            </div>
        </header>
    );
};

export default Header;