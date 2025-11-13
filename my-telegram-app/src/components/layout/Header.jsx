// "use client" - Keep this at the very top for Next.js App Router or similar environments
"use client"

import { useState, useEffect, useCallback, useRef } from "react" // --- FIX ---: Make sure 'useRef' is imported
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
import MainSearchBar from "../search/MainSearchBar"
import CompactSearchButton from "../search/CompactSearchButton"
import SearchPopover from "../search/SearchPopover"
import HeaderActions from "./HeaderActions"
import PreHeader from "./PreHeader"

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
  const { getCartItemCount } = useCart()
  const { searchTerm, handleSearchTermChange, clearSearch, isSearching, searchError, searchResults } = useSearch()

  // State
  const [addressFormData, setAddressFormData] = useState({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [isCityPopoverOpen, setIsCityPopoverOpen] = useState(false)
  const [isChangingCity, setIsChangingCity] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false)
  const [preloadedCities, setPreloadedCities] = useState(null)
  const sentinelRef = useRef(null)
  const searchInputRef = useRef(null)

  // IntersectionObserver for compact header (unchanged)
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

  // --- FIX 1 ---: This useEffect was causing the bug. It has been REMOVED.
  // useEffect(() => {
  //   if (isCompact && isSearchExpanded) {
  //     setIsSearchExpanded(false)
  //     setIsSearchFocused(false)
  //   }
  // }, [isCompact, isSearchExpanded])

  // --- FIX 1 ---: Add a new useEffect to FOCUS the input when it expands
  useEffect(() => {
    // If we just expanded the search and the input exists, focus it.
    if (isSearchExpanded && searchInputRef.current) {
      // Small delay to allow the animation to start
      setTimeout(() => {
        searchInputRef.current.focus()
      }, 50) 
    }
  }, [isSearchExpanded])


  // Load cities once safely (unchanged)
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

  // Telegram WebApp integration (unchanged)
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

  // --- Handlers --- (unchanged)
  const handleSaveProfileFromModal = useCallback(
    async (e, updatedFormData) => {
      e.preventDefault()
      setIsSavingProfile(true)
      setProfileError(null)

      try {
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
          // Logic to navigate to a full search results page
          console.log("Navigate to all results for:", searchTerm)
        }}
      />

      <motion.header
        className={`sticky top-0 z-30 pt-[env(safe-area-inset-top, 16px)] ${
          isCompact ? "bg-white/95 backdrop-blur-xl shadow-lg" : "bg-white/95 backdrop-blur-sm shadow-sm"
        }`}
      >
        <div
          className={`px-3 sm:px-4 max-w-4xl mx-auto flex flex-col items-center ${isCompact ? "py-3" : "py-6"}`}
          style={{ gap: isCompact ? "0.75rem" : "1.25rem" }}
        >
          <PreHeader />
          <HeaderActions
            isCompact={isCompact}
            isSearchExpanded={isSearchExpanded}
            isChangingCity={isChangingCity}
            userProfile={userProfile}
            telegramUser={telegramUser}
            isCityPopoverOpen={isCityPopoverOpen}
            setIsCityPopoverOpen={setIsCityPopoverOpen}
            handleCityChange={handleCityChange}
            preloadedCities={preloadedCities}
            handleOpenProfileModal={handleOpenProfileModal}
            setIsSearchPopoverOpen={setIsSearchPopoverOpen}
          />

          {/* --- SEARCH COMPONENTS --- */}
          <AnimatePresence mode="wait">
            <MainSearchBar
              isVisible={!isCompact || isSearchExpanded}
              isCompact={isCompact}
              searchTerm={searchTerm}
              onSearchTermChange={(e) => handleSearchTermChange(DOMPurify.sanitize(e.target.value))}
              onClearSearch={clearSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              inputRef={searchInputRef}
            />
          </AnimatePresence>

          {children}
        </div>
      </motion.header>
    </>
  )
}

export default Header