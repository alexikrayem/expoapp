"use client"

import { useState, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { useModal } from "../../context/ModalContext"
import { useCart } from "../../context/CartContext"
import { useSearch } from "../../context/SearchContext"
import { userService } from "../../services/userService"

import { ShoppingCart, Search, X, MapPin, Loader2, Bell, ChevronDown, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import ProfileIcon from "../common/ProfileIcon"
import CityChangePopover from "../common/CityChangePopover"

const Header = ({ children }) => {
  const { telegramUser, userProfile, onProfileUpdate } = useOutletContext()
  const { openModal } = useModal()
  const { getCartItemCount } = useCart()
  const { searchTerm, handleSearchTermChange, clearSearch } = useSearch()

  const [addressFormData, setAddressFormData] = useState({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false)
  const [isChangingCity, setIsChangingCity] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  // Scroll detection for compact header
  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Enhanced Telegram Web App integration
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()

      // Set theme colors
      tg.setHeaderColor("#ffffff")
      tg.setBackgroundColor("#f8fafc")

      // Enable closing confirmation
      tg.enableClosingConfirmation()

      // Hide main button to avoid confusion
      tg.MainButton.hide()

      // Configure back button
      tg.BackButton.onClick(() => {
        if (window.history.length > 1) {
          window.history.back()
        } else {
          tg.close()
        }
      })

      console.log("✅ Enhanced Telegram Web App initialized")
    }
  }, [])

  const handleOpenProfileModal = () => {
    const formData = {
      fullName: userProfile?.full_name || `${telegramUser?.first_name || ""} ${telegramUser?.last_name || ""}`.trim(),
      phoneNumber: userProfile?.phone_number || "",
      addressLine1: userProfile?.address_line1 || "",
      addressLine2: userProfile?.address_line2 || "",
      city: userProfile?.city || userProfile?.selected_city_name || "",
    }
    setAddressFormData(formData)
    setProfileError(null)

    openModal("profile", {
      formData,
      onFormChange: handleAddressFormChange,
      onFormSubmit: handleSaveProfileFromModal,
      error: profileError,
      isSaving: isSavingProfile,
    })

    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
  }

  const handleAddressFormChange = (e) => {
    const { name, value } = e.target
    setAddressFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfileFromModal = async (e) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileError(null)
    try {
      await userService.updateProfile(addressFormData)
      onProfileUpdate()
      openModal(null)
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success")
    } catch (error) {
      setProfileError(error.message || "Failed to save profile.")
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCityChange = async (city) => {
    if (!city || isChangingCity) return
    setIsChangingCity(true)
    setIsCityPopoverOpen(false)
    try {
      await userService.updateProfile({ selected_city_id: city.id })
      onProfileUpdate()
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success")
    } catch {
      alert("فشل تغيير المدينة.")
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error")
    } finally {
      setIsChangingCity(false)
    }
  }

  const handleSearchFocus = () => {
    setIsSearchFocused(true)
    setIsSearchExpanded(true)
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
  }

  const handleSearchBlur = () => {
    setIsSearchFocused(false)
    if (!searchTerm) setIsSearchExpanded(false)
  }

  const cartItemCount = getCartItemCount()

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`sticky top-0 z-30 transition-all duration-300 ${
        isCompact
          ? "bg-white/95 backdrop-blur-xl shadow-lg py-2"
          : "bg-gradient-to-r from-blue-50 via-white to-indigo-50 py-4"
      }`}
    >
      <div className="px-3 sm:px-4 max-w-4xl mx-auto">
        {/* Top row */}
        <div className={`flex items-center justify-between gap-2 ${isCompact ? "mb-2" : "mb-4"}`}>
          {/* Logo and Brand */}
          <motion.div
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 border-2 border-white rounded-full"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-lg font-bold text-gray-800 leading-tight truncate">معرض طبيب</span>
              <span className="text-xs text-gray-500 leading-tight truncate">المستلزمات الطبية</span>
            </div>
          </motion.div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* City selector */}
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
                    currentCityId={userProfile?.selected_city_id}
                    onCitySelect={handleCityChange}
                    onClose={() => setIsCityPopoverOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-1.5 sm:p-2 bg-white/80 backdrop-blur-sm text-gray-600 rounded-xl hover:bg-white transition-all shadow-sm border border-gray-200"
              title="الإشعارات"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center font-bold shadow-md"
              >
                <span className="text-[8px] sm:text-xs">3</span>
              </motion.span>
            </motion.button>

            {/* Cart button (desktop) */}
            {cartItemCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openModal("cart")}
                className="relative p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
                title="السلة"
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                <motion.span
                  key={cartItemCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-blue-900 text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold shadow-md"
                >
                  <span className="text-[8px] sm:text-xs">{cartItemCount}</span>
                </motion.span>
              </motion.button>
            )}

            {/* Compact search icon */}
            {isCompact && !isSearchExpanded && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSearchExpanded(true)}
                className="p-1.5 sm:p-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition-all border border-gray-200 shadow-sm"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative"
          >
            <motion.div
              className="relative"
              animate={{
                boxShadow: isSearchFocused
                  ? "0 8px 30px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.2)"
                  : "0 2px 10px rgba(0, 0, 0, 0.05)",
              }}
              transition={{ duration: 0.3 }}
            >
              <Search className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 z-10" />
              <motion.input
                type="text"
                placeholder="ابحث عن المنتجات، الموردين، العروض..."
                value={searchTerm}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border-0 bg-white/90 backdrop-blur-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 text-sm placeholder-gray-500 shadow-sm"
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    onClick={clearSearch}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors z-10 flex items-center justify-center"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {children}
      </div>
    </motion.header>
  )
}

export default Header
