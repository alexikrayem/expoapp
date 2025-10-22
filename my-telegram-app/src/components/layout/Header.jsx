// "use client" - Keep this at the very top for Next.js App Router or similar environments
"use client";

import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useModal } from "../../context/ModalContext";
import { useCart } from "../../context/CartContext";
import { useSearch } from "../../context/SearchContext";
import { userService } from "../../services/userService";
import { cityService } from "../../services/cityService";
import appLogoImage from "/src/assets/IMG_1787.png"; // Ensure this path is correct for your project

import {
  ShoppingCart,
  Search,
  X,
  MapPin,
  Loader2,
  Bell,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ProfileIcon from "../common/ProfileIcon";
import CityChangePopover from "../common/CityChangePopover";

// Preload cities outside the component to avoid re-fetching on every render
let preloadedCities = null;

const Header = ({ children }) => {
  const { telegramUser, userProfile, onProfileUpdate } = useOutletContext() || {};
  const { openModal } = useModal();
  const { getCartItemCount } = useCart();
  const { searchTerm, handleSearchTermChange, clearSearch } = useSearch();

  // State variables for various UI interactions and data management
  const [addressFormData, setAddressFormData] = useState({}); // For profile modal
  const [isSavingProfile, setIsSavingProfile] = useState(false); // Loading state for profile save
  const [profileError, setProfileError] = useState(null); // Error for profile save
  const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false); // State for city selection popover
  const [isChangingCity, setIsChangingCity] = useState(false); // Loading state for city change
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Tracks if search input is focused
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); // Controls search bar visibility in compact mode
  const [isCompact, setIsCompact] = useState(false); // Controls compact header state on scroll

  // Effect to handle header compaction based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const compact = window.scrollY > 50; // Threshold for compact mode
      setIsCompact(compact);

      // Collapse search bar if compact and not focused, to save space
      if (compact && isSearchExpanded && !isSearchFocused) {
        setIsSearchExpanded(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSearchExpanded, isSearchFocused]); // Re-run if search state changes

  // Effect to preload cities data once
  useEffect(() => {
    if (!preloadedCities) {
      cityService
        .getCities()
        .then((data) => {
          preloadedCities = data;
        })
        .catch((err) => console.error("Failed to preload cities:", err));
    }
  }, []); // Empty dependency array means this runs once on mount

  // Effect for enhanced Telegram Web App integration
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); // Signal that the app is ready
      tg.expand(); // Ensure the mini app is in full-screen mode

      // Set Telegram's native header and background colors to match your app's theme
      // Your app's header will extend behind these UI elements due to safe-area-inset-top
      tg.setHeaderColor("#ffffff"); // Matches your header's bg-white
      tg.setBackgroundColor("#f8fafc"); // A light grey-white for the main app background

      // Enable closing confirmation to prevent accidental closes
      tg.enableClosingConfirmation();

      // Hide Telegram's main button if not used, to avoid confusion
      tg.MainButton.hide();

      // Configure Telegram's back button behavior
      tg.BackButton.onClick(() => {
        if (window.history.length > 1) {
          window.history.back(); // Use browser history if possible
        } else {
          tg.close(); // Otherwise, close the Mini App
        }
      });

      console.log("✅ Enhanced Telegram Web App initialized");
    }
  }, []); // Runs once on mount

  // Handler to open the profile modal with pre-filled user data
  const handleOpenProfileModal = () => {
    const formData = {
      fullName:
        userProfile?.full_name || `${telegramUser?.first_name || ""} ${telegramUser?.last_name || ""}`.trim(),
      phoneNumber: userProfile?.phone_number || "",
      addressLine1: userProfile?.address_line1 || "",
      addressLine2: userProfile?.address_line2 || "",
      city: userProfile?.city || userProfile?.selected_city_name || "",
    };
    console.log("[v0] Opening profile modal with formData:", formData);
    setAddressFormData(formData);
    setProfileError(null); // Clear any previous errors

    openModal("profile", {
      formData,
      telegramUser,
      onFormSubmit: handleSaveProfileFromModal,
      error: profileError,
      isSaving: isSavingProfile,
    });

    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light");
  };

  // Handler for changes in the profile form (though the modal might manage its own state)
  const handleAddressFormChange = (e) => {
    const { name, value } = e.target;
    setAddressFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler to save profile data from the modal
  const handleSaveProfileFromModal = async (e, updatedFormData) => {
    e.preventDefault();
    console.log("[v0] Saving profile with data:", updatedFormData);
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await userService.updateProfile(updatedFormData);
      onProfileUpdate(); // Trigger a profile data refresh
      openModal(null); // Close the modal
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success");
    } catch (error) {
      console.error("[v0] Profile save error:", error);
      setProfileError(error.message || "Failed to save profile.");
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handler to change the user's selected city
  const handleCityChange = async (city) => {
    if (!city || isChangingCity) return;
    setIsChangingCity(true);
    setIsCityPopoverOpen(false); // Close popover immediately
    try {
      await userService.updateProfile({ selected_city_id: city.id });
      onProfileUpdate(); // Trigger profile data refresh
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success");
    } catch {
      alert("فشل تغيير المدينة."); // Display error in Arabic
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error");
    } finally {
      setIsChangingCity(false);
    }
  };

  // Handler for when the search input gains focus
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setIsSearchExpanded(true); // Always expand search when focused
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light");
  };

  // Handler for when the search input loses focus
  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    if (!searchTerm) {
      setIsSearchExpanded(false); // Collapse search if no term and not focused
    }
  };

  const cartItemCount = getCartItemCount(); // Get current item count for cart badge

  return (
    <motion.header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top, 16px)] ${
        isCompact ? "bg-white/95 backdrop-blur-xl shadow-lg" : "bg-white/95 backdrop-blur-sm shadow-sm"
      }`}
    >
      <div
        className={`px-3 sm:px-4 max-w-4xl mx-auto flex flex-col items-center ${isCompact ? "py-3" : "py-6"}`}
        style={{ gap: isCompact ? "0.75rem" : "1.25rem" }}
      >
        {/* --- PREHEADER COMPONENT: Logo + Brand Text (Centered, fixed size, with left padding) --- */}
        {/* --- PREHEADER COMPONENT: Centered Logo + Brand Text --- */}
<motion.div
  className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2 mt-4"
>
  <img
    src={appLogoImage}
    alt="App Logo"
    className="object-contain rounded-xl w-10 h-10 sm:w-12 sm:h-12 mt-6"
  />
  <div className="flex flex-col items-center text-center mt-6">
    <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">
      معرض طبيب
    </span>
    <span className="text-sm text-gray-500 leading-tight truncate">
      المستلزمات الطبية
    </span>
  </div>
</motion.div>


        {/* --- ACTIONS ROW (City Selector on Left, Other Actions on Right) --- */}
        <div className="w-full flex items-center justify-between flex-shrink-0">
          {/* Left Group: City selector */}
          <div className="flex items-center"> {/* Group for left-aligned items */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCityPopoverOpen((prev) => !prev)}
                disabled={isChangingCity}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white transition-all shadow-sm border border-gray-200 disabled:opacity-70"
              >
                {isChangingCity ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                )}
                <div className="hidden sm:flex flex-col items-start min-w-0">
                  <span className="text-[10px] text-gray-500 leading-none">المدينة</span>
                  <span className="text-xs font-semibold text-gray-800 leading-none truncate max-w-16">
                    {isChangingCity ? "جاري..." : userProfile?.selected_city_name || "اختر"}
                  </span>
                </div>
                <span className="sm:hidden text-xs font-semibold text-gray-800 truncate max-w-12">
                  {isChangingCity ? "..." : userProfile?.selected_city_name || "مدينة"}
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400 hidden sm:block" />
              </motion.button>

              <AnimatePresence>
                {isCityPopoverOpen && (
                  <CityChangePopover
                    onCitySelect={handleCityChange}
                    currentCityId={userProfile?.selected_city_id}
                    onClose={() => setIsCityPopoverOpen(false)}
                    preloadedCities={preloadedCities}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Group: Notifications, Cart, Profile, Compact Search */}
          <div className="flex items-center gap-1 sm:gap-2"> {/* Group for right-aligned items */}
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center 
           bg-white/80 backdrop-blur-sm text-gray-600 rounded-xl hover:bg-white 
           transition-all shadow-sm border border-gray-200"
              title="الإشعارات"
            >
              <Bell className="h-5 w-5 text-gray-600" />

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center font-bold shadow-md"
              >
                <span className="text-[8px] sm:text-xs">3</span>
              </motion.span>
            </motion.button>

           

            {/* Compact search icon (only visible when header is compact and search isn't expanded) */}
            {isCompact && !isSearchExpanded && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchExpanded(true)}
                className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center 
               bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white 
               transition-all border border-gray-200 shadow-sm"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </motion.button>
            )}

            {/* Profile Icon */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
            </motion.div>
          </div>
        </div>

        {/* --- SEARCH BAR ROW (Full width, below actions) --- */}
        {(!isCompact || isSearchExpanded) && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative w-full"
          >
            <motion.div
              className="relative h-10 sm:h-11"
              animate={{
                boxShadow: isSearchFocused
                  ? "0 8px 30px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2)"
                  : "0 2px 10px rgba(0, 0, 0, 0.05)",
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Search icon */}
              <Search className="absolute right-3 sm:right-4 top-0 bottom-0 m-auto h-4 w-4 sm:h-5 sm:w-5 text-gray-400 z-10" />

              {/* Input field */}
              <motion.input
                type="text"
                placeholder="ابحث عن المنتجات، الموردين، العروض..."
                value={searchTerm}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
                className="w-full h-full pl-10 sm:pl-12 pr-10 sm:pr-12 border border-gray-200 bg-gray-100 
                focus:bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 
                transition-all duration-300 text-sm placeholder-gray-500 shadow-sm leading-none"
              />

              {/* Clear (X) button */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    onClick={clearSearch}
                    className="absolute left-2 sm:left-3 top-0 bottom-0 m-auto h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors z-10"
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5 align-middle" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* Children (main content of your app) will render below the header */}
        {children}
      </div>
    </motion.header>
  );
};

export default Header;