// "use client" - Keep this at the very top for Next.js App Router or similar environments
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useOutletContext } from "react-router-dom"
import { useModal } from "../../context/ModalContext"
import { useSearch } from "../../context/SearchContext"
import { userService } from "../../services/userService"
import { cityService } from "../../services/cityService"
import appLogoImage from "/src/assets/IMG_1787.png"
import DOMPurify from "dompurify" // sanitize user input safely

import { AnimatePresence, motion } from "framer-motion"
import SearchPopover from "../search/SearchPopover"
import HeaderActions from "./HeaderActions"

// Utility: throttle (unchanged)
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
  const { searchTerm, handleSearchTermChange, clearSearch, isSearching, searchError, searchResults } = useSearch()

  // State
  const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false)
  const [isChangingCity, setIsChangingCity] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false)
  const [preloadedCities, setPreloadedCities] = useState(null)
  const sentinelRef = useRef(null)

  // IntersectionObserver for compact header
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompact(!entry.isIntersecting)
      },
      {
        threshold: [0],
        rootMargin: "0px",
      },
    )

    observer.observe(sentinel)

    return () => {
      if (sentinel) observer.unobserve(sentinel)
    }
  }, [])

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
  const handleCityChange = async (city) => {
    if (!city || isChangingCity) return
    setIsChangingCity(true)
    setIsCityPopoverOpen(false)
    try {
      await userService.updateProfile({ selected_city_id: city.id })
      onProfileUpdate()
      window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success")
    } catch {
      console.warn("City change failed")
      window?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error")
    } finally {
      setIsChangingCity(false)
    }
  }

  // --- JSX ---
  return (
    <>
      <div ref={sentinelRef} id="page-top-sentinel" style={{ height: 0, visibility: "hidden" }} aria-hidden="true" />

      <SearchPopover
        isOpen={isSearchPopoverOpen}
        onClose={() => setIsSearchPopoverOpen(false)}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        onClearSearch={clearSearch}
        isSearching={isSearching}
        searchError={searchError}
        searchResults={searchResults}
        onShowAllResults={() => {
          console.log("Navigate to all results for:", searchTerm)
        }}
      />

      <motion.header
        animate={{ height: isCompact ? 80 : 120 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`sticky top-0 z-30 pt-[env(safe-area-inset-top, 16px)] glass-nav transition-all duration-300 ${isCompact ? 'shadow-md py-2' : 'shadow-sm py-4'}`}
      >
        <div className="px-3 sm:px-4 max-w-4xl mx-auto h-full flex items-center justify-between">
          {/* Right Side: Logo and App Name */}
          <div className="flex items-center gap-3">
            <motion.img
              src={appLogoImage}
              alt="App Logo"
              className="object-contain rounded-xl"
              animate={{
                width: isCompact ? 40 : 56,
                height: isCompact ? 40 : 56,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <motion.div
              className="flex flex-col"
              animate={{ opacity: isCompact ? 0 : 1, width: isCompact ? 0 : 'auto' }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">معرض طبيب</span>
              <span className="text-sm text-gray-500 leading-tight truncate">المستلزمات الطبية</span>
            </motion.div>
          </div>

          {/* Left Side: Actions */}
          <HeaderActions
            isChangingCity={isChangingCity}
            userProfile={userProfile}
            telegramUser={telegramUser}
            isCityPopoverOpen={isCityPopoverOpen}
            setIsCityPopoverOpen={setIsCityPopoverOpen}
            handleCityChange={handleCityChange}
            preloadedCities={preloadedCities}
            handleOpenProfileModal={() => openModal("profile", { telegramUser, userProfile })}
            setIsSearchPopoverOpen={setIsSearchPopoverOpen}
          />
        </div>
      </motion.header>

      {/* This is where the tab navigation below the header will be rendered */}
      <div className="px-3 sm:px-4 max-w-4xl mx-auto">
        {children}
      </div>
    </>
  )
}

export default Header;