// src/components/layout/HeaderActions.jsx
import React from "react"
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Loader2, ChevronDown, Settings } from "lucide-react"
import ProfileIcon from "../common/ProfileIcon"
import CityChangePopover from "../common/CityChangePopover"
import HeaderSearchButton from "../search/HeaderSearchButton";

const HeaderActions = ({
  isChangingCity,
  userProfile,
  telegramUser,
  isCityPopoverOpen,
  setIsCityPopoverOpen,
  handleCityChange,
  preloadedCities,
  handleOpenProfileModal,
  setIsSearchPopoverOpen,
}) => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/settings');
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light");
  };

  return (
    <div className="w-full flex items-center justify-between flex-shrink-0">
      {/* Left actions (in LTR), will appear on the right in RTL */}
      <div className="flex items-center gap-1 sm:gap-2">
        <HeaderSearchButton onClick={() => setIsSearchPopoverOpen(true)} />
        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSettingsClick}
          className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center 
        bg-white/80 backdrop-blur-sm text-gray-600 rounded-xl hover:bg-white 
        transition-all shadow-sm border border-gray-200"
          title="الإعدادات"
        >
          <Settings className="h-5 w-5 text-gray-600" />
        </motion.button>

        {/* Profile */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
        </motion.div>
      </div>

      {/* Right-side City selector (in LTR), will appear on the left in RTL */}
      <div className="flex items-center">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCityPopoverOpen((prev) => !prev)}
            disabled={isChangingCity}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white transition-all shadow-sm border border-gray-200 disabled:opacity-70"
          >
            {isChangingCity ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> : <MapPin className="h-4 w-4 text-blue-500" />}
            <span className="flex flex-col items-start min-w-0">
              <span className="text-[10px] text-gray-500 leading-none">المدينة</span>
              <span className="text-xs font-semibold text-gray-800 leading-none truncate max-w-16">
                {isChangingCity ? "جاري..." : userProfile?.selected_city_name || "اختر"}
              </span>
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
    </div>
  )
}

export default HeaderActions