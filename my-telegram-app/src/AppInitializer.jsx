"use client"

import { useEffect, useState, useCallback } from "react"
import { Outlet } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { userService } from "./services/userService"
import CitySelectionModal from "./components/modals/CitySelectionModal"
import { SearchProvider } from "./context/SearchContext"
import { CartProvider } from "./context/CartContext"
import { FilterProvider } from "./context/FilterContext"
import { CheckoutProvider } from "./context/CheckoutContext"
import { MiniCartProvider } from "./context/MiniCartContext"
import { CacheProvider } from "./context/CacheContext"
import { Loader2, XCircle } from "lucide-react"
import "./index.css"

import appLogoImage from "./assets/IMG_1787.jpg" // will act as logo

const dentistQuotes = [
  { quote: "كل سن في رأس الرجل أثمن من الماس.", author: "ميغيل دي ثيربانتس" },
  { quote: "صحة الفم هي نافذة على صحتك العامة.", author: "سي. إيفرت كوب" },
  { quote: "الابتسامة هي انحناءة تجعل كل شيء مستقيمًا.", author: "فيليس ديلر" },
  { quote: "الفم هو بوابة الجسم.", author: "مجهول" },
  { quote: "أسنان صحية، جسم سليم.", author: "مثل شعبي" },
  { quote: "الوقاية خير من العلاج، خاصة في طب الأسنان.", author: "مقولة شائعة" },
]

const AppInitializer = () => {
  const [telegramUser, setTelegramUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [initializationStep, setInitializationStep] = useState("تهيئة التطبيق...")
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)

  const fetchUserProfile = useCallback(async () => {
    try {
      setInitializationStep("تحميل ملفك الشخصي...")
      const profileData = await userService.getProfile()
      setUserProfile(profileData)
    } catch (err) {
      if (err.status === 404) setUserProfile({ selected_city_id: null })
      else setError("حدث خطأ أثناء تحميل ملفك الشخصي.")
    } finally {
      setTimeout(() => setIsLoading(false), 1500)
    }
  }, [])

  useEffect(() => {
    const initializeApp = async () => {
      setInitializationStep("الاتصال بتيليجرام...")
      const tg = window.Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()
        tg.setHeaderColor("#ffffff")
        tg.setBackgroundColor("#ffffff")
        tg.enableClosingConfirmation()
        tg.HapticFeedback.impactOccurred("light")
      }
      const user = tg?.initDataUnsafe?.user || { id: 123456, first_name: "Local", last_name: "Dev" }
      setTelegramUser(user)
      await fetchUserProfile()
    }
    initializeApp()
  }, [fetchUserProfile])

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % dentistQuotes.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  const handleCitySelect = async ({ cityId }) => {
    try {
      setInitializationStep("حفظ اختيار المدينة...")
      const updatedProfile = await userService.updateProfile({ selected_city_id: cityId })
      setUserProfile(updatedProfile)
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success")
    } catch {
      setError("حدث خطأ أثناء حفظ اختيار المدينة.")
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error")
    }
  }

  if (isLoading) {
    const currentQuote = dentistQuotes[currentQuoteIndex]
    return (
      <div className="w-screen h-screen bg-white flex flex-col items-center justify-center text-gray-800 font-sans">
        {/* Logo as Image */}
        <motion.img
          src={appLogoImage}
          alt="App Logo"
          className="w-48 h-48 object-contain mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* App Name */}
        <motion.h1
          className="text-3xl font-extrabold mb-6 text-gray-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          معرض المستلزمات الطبية
        </motion.h1>

        {/* Loading Step */}
        <motion.div className="flex items-center gap-3 mb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
          <span className="text-base">{initializationStep}</span>
        </motion.div>

        {/* Quote Section */}
        <div className="absolute bottom-16 px-6 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuote.quote}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7 }}
              className="text-gray-700 text-lg italic"
              dir="rtl"
            >
              "{currentQuote.quote}"
              <div className="text-sm font-semibold text-blue-500 mt-1">- {currentQuote.author}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-900 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="p-4 bg-red-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </motion.div>
      </div>
    )
  }

  if (userProfile && !userProfile.selected_city_id) {
    return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />
  }

  return (
    <CacheProvider>
      <MiniCartProvider>
        <CartProvider user={telegramUser}>
          <SearchProvider cityId={userProfile?.selected_city_id}>
            <FilterProvider>
              <CheckoutProvider>
                <Outlet context={{ telegramUser, userProfile, onProfileUpdate: fetchUserProfile }} />
              </CheckoutProvider>
            </FilterProvider>
          </SearchProvider>
        </CartProvider>
      </MiniCartProvider>
    </CacheProvider>
  )
}

export default AppInitializer
