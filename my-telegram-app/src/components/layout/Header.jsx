// "use client" - Keep this at the very top for Next.js App Router or similar environments
"use client"

import { useState, useEffect, useCallback } from "react"
import { useOutletContext } from "react-router-dom"
import { useModal } from "../../context/ModalContext"
import { useCart } from "../../context/CartContext"
import { useSearch } from "../../context/SearchContext"
import { userService } from "../../services/userService"
import { cityService } from "../../services/cityService"
import appLogoImage from "/src/assets/IMG_1787.png"
import DOMPurify from "dompurify" // sanitize user input safely

import { Search, X, MapPin, Loader2, Bell, ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import ProfileIcon from "../common/ProfileIcon"
import CityChangePopover from "../common/CityChangePopover"

// Utility: throttle to avoid frequent scroll updates
const throttle = (fn, delay) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }
}

const Header = ({ children }) => {
  const { telegramUser, userProfile, onProfileUpdate } = useOutletContext() || {}
  const { openModal } = useModal()
  const { getCartItemCount } = useCart()
  const { searchTerm, handleSearchTermChange, clearSearch } = useSearch()

  // State
  const [addressFormData, setAddressFormData] = useState({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false)
  const [isChangingCity, setIsChangingCity] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [preloadedCities, setPreloadedCities] = useState(null)

// Detect scroll position for compact mode
useEffect(() => {
  const handleScroll = throttle(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    setIsCompact(scrollTop > 10) // adjust threshold as desired
  }, 100)

  window.addEventListener("scroll", handleScroll, { passive: true })
  handleScroll() // run once initially

  return () => {
    window.removeEventListener("scroll", handleScroll)
  }
}, [])


  // Also detect when search is expanded to collapse it on compact
  useEffect(() => {
    if (isCompact && isSearchExpanded) {
      // Auto-collapse search if window becomes compact
      setIsSearchExpanded(false)
      setIsSearchFocused(false)
    }
  }, [isCompact, isSearchExpanded])

  // Load cities once safely
  useEffect(() => {
    let isMounted = true
    cityService
      .getCities()
      .then((data) => {
        if (isMounted) setPreloadedCities(data)
      })
      .catch((err) => console.error("Failed to preload cities:", err))
    return () => {
      isMounted = false
    }
  }, [])

  // Telegram WebApp integration
  useEffect(() => {
    const tg = window?.Telegram?.WebApp
    if (!tg) return
    tg.ready()
    tg.expand()
    tg.setHeaderColor("#ffffff")
    tg.setBackgroundColor("#f8fafc")
    tg.enableClosingConfirmation()
    tg.MainButton.hide()

    tg.BackButton.onClick(() => {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        tg.close()
      }
    })
  }, [])

  // --- Handlers ---
  const handleSaveProfileFromModal = useCallback(
    async (e, updatedFormData) => {
      e.preventDefault()
      setIsSavingProfile(true)
      setProfileError(null)

      try {
        // sanitize all user inputs
        const safeData = Object.fromEntries(
          Object.entries(updatedFormData).map(([k, v]) => [k, DOMPurify.sanitize(v).trim()]),
        )

        await userService.updateProfile(safeData)
        onProfileUpdate()
        openModal(null)
        window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success")
      } catch (error) {
        console.error("Profile save error:", error)
        setProfileError(error.message || "Failed to save profile.")
        window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error")
      } finally {
        setIsSavingProfile(false)
      }
    },
    [onProfileUpdate, openModal],
  )

  const handleOpenProfileModal = useCallback(() => {
    const formData = {
      fullName: userProfile?.full_name || `${telegramUser?.first_name || ""} ${telegramUser?.last_name || ""}`.trim(),
      phoneNumber: userProfile?.phone_number || "",
      addressLine1: userProfile?.address_line1 || "",
      addressLine2: userProfile?.address_line2 || "",
      city: userProfile?.city || userProfile?.selected_city_name || "",
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Opening profile modal with:", formData)
    }

    setAddressFormData(formData)
    setProfileError(null)

    openModal("profile", {
      formData,
      telegramUser,
      onFormSubmit: handleSaveProfileFromModal,
      error: profileError,
      isSaving: isSavingProfile,
    })

    window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light")
  }, [userProfile, telegramUser, openModal, handleSaveProfileFromModal, isSavingProfile, profileError])

  const handleAddressFormChange = (e) => {
    const { name, value } = e.target
    setAddressFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCityChange = async (city) => {
    if (!city || isChangingCity) return
    setIsChangingCity(true)
    setIsCityPopoverOpen(false)
    try {
      await userService.updateProfile({ selected_city_id: city.id })
      onProfileUpdate()
      window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success")
    } catch {
      // safe, non-blocking user feedback
      console.warn("City change failed")
      window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error")
    } finally {
      setIsChangingCity(false)
    }
  }

  const handleSearchFocus = () => {
    setIsSearchFocused(true)
    setIsSearchExpanded(true)
    window?.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light")
  }

  const handleSearchBlur = () => {
    setIsSearchFocused(false)
    if (!searchTerm) setIsSearchExpanded(false)
  }

  const cartItemCount = getCartItemCount()

  // --- JSX ---
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
        {/* --- PREHEADER --- */}
        <motion.div className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2 mt-4">
          <img
            src={appLogoImage || "/placeholder.svg"}
            alt="App Logo"
            className="object-contain rounded-xl w-10 h-10 sm:w-12 sm:h-12 mt-6"
          />
          <div className="flex flex-col items-center text-center mt-6">
            <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">معرض طبيب</span>
            <span className="text-sm text-gray-500 leading-tight truncate">المستلزمات الطبية</span>
          </div>
        </motion.div>

        {/* --- ACTIONS --- */}
        <div className="w-full flex items-center justify-between flex-shrink-0">
          {/* City selector */}
          <div className="flex items-center">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCityPopoverOpen((prev) => !prev)}
                disabled={isChangingCity}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white transition-all shadow-sm border border-gray-200 disabled:opacity-70"
              >
                {isChangingCity ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 text-blue-500" />
                )}
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

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
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
                className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] sm:text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-md"
              >
                3
              </motion.span>
            </motion.button>

            {/* Search Button (Compact Mode) */}
            <AnimatePresence mode="wait">
              {isCompact && !isSearchExpanded && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSearchExpanded(true)}
                  disabled={!isCompact}
                  style={{ willChange: "opacity, transform" }}
                  className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center 
    bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white 
    transition-all border border-gray-200 shadow-sm
    ${isCompact && !isSearchExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                  animate={{
                    opacity: isCompact && !isSearchExpanded ? 1 : 0,
                    y: isCompact && !isSearchExpanded ? 0 : -6,
                    scale: isCompact && !isSearchExpanded ? 1 : 0.95,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <Search className="h-5 w-5 text-gray-600" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Profile */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ProfileIcon user={telegramUser} onClick={handleOpenProfileModal} />
            </motion.div>
          </div>
        </div>

        {/* --- SEARCH BAR --- */}
        <AnimatePresence mode="wait">
          {(!isCompact || isSearchExpanded) && (
            <motion.div key="expanded-search" transition={{ duration: 0.25 }} className="relative w-full">
              <div className="relative h-10 sm:h-11">
                <Search className="absolute right-3 sm:right-4 top-0 bottom-0 m-auto h-4 w-4 sm:h-5 sm:w-5 text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات، الموردين، العروض..."
                  value={searchTerm}
                  onChange={(e) => handleSearchTermChange(DOMPurify.sanitize(e.target.value))}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                  className="w-full h-full pl-10 sm:pl-12 pr-10 sm:pr-12 border border-gray-200 bg-gray-100 
            focus:bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 
            transition-all duration-300 text-sm placeholder-gray-500 shadow-sm leading-none"
                />
                {searchTerm && (
                  <motion.button
                    key="clear"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearSearch}
                    className="absolute left-2 sm:left-3 top-0 bottom-0 m-auto h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors z-10"
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {children}
      </div>
    </motion.header>
  )
}

export default Header
