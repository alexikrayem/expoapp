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
import appLogoImage from "./assets/IMG_1787.png"
import WelcomeOnboardingModal from "./components/WelcomeOnboardingModal"

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
  const [step, setStep] = useState("تهيئة التطبيق...")
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // --- Helpers ---
  const fetchUserProfile = useCallback(async () => {
    try {
      setStep("تحميل ملفك الشخصي...")
      const profileData = await userService.getProfile()
      setUserProfile(profileData)
    } catch (err) {
      if (err.status === 404) setUserProfile({ selected_city_id: null })
      else setError("حدث خطأ أثناء تحميل ملفك الشخصي.")
    } finally {
      setTimeout(() => setIsLoading(false), 1200)
    }
  }, [])

    const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
  try {
    return localStorage.getItem("hasSeenWelcome_v1") === "true";
  } catch {
    return false;
  }
});

  // --- Initialize Telegram + profile ---
  useEffect(() => {
    const init = async () => {
      setStep("الاتصال بتيليجرام...")
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
    init()
  }, [fetchUserProfile])

  // --- Cycle quotes while loading ---
  useEffect(() => {
    if (!isLoading) return
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % dentistQuotes.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isLoading])

  useEffect(() => {
  const hasSeenWelcome = localStorage.getItem("hasSeenWelcome_v1")
  if (!hasSeenWelcome) {
    setTimeout(() => setShowOnboarding(true), 800)
  }
}, [])


  const handleCitySelect = async ({ cityId }) => {
    try {
      setStep("حفظ اختيار المدينة...")
      const updatedProfile = await userService.updateProfile({ selected_city_id: cityId })
      setUserProfile(updatedProfile)
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success")
    } catch {
      setError("حدث خطأ أثناء حفظ اختيار المدينة.")
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error")
    }
  }

  const handleFinishWelcome = () => {
  try {
    localStorage.setItem("hasSeenWelcome_v1", "true");
  } catch {}
  setHasSeenWelcome(true);
  // Optionally: send update to backend:
  // await userService.updateProfile({ has_seen_welcome: true })
};


  // --- Loading Screen ---
 {/* Loading Screen */}
if (isLoading) {
  const currentQuote = dentistQuotes[quoteIndex]
  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center text-gray-800 px-6 font-sans relative"
      style={{
        background: "linear-gradient(to top, #e6f4ff 0%, #ffffff 70%)", // icy blue -> white
      }}
    >
      {/* Logo */}
      <motion.img
        src={appLogoImage}
        alt="App Logo"
       className="w-40 h-40 object-contain mb-6"

        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* App Title */}
      <motion.h1
        className="text-3xl font-extrabold mb-4 text-gray-900"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        معرض المستلزمات الطبية
      </motion.h1>

      {/* Loading Step */}
      <motion.div
        className="flex items-center gap-3 text-gray-700 mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        <span className="text-base font-medium">{step}</span>
      </motion.div>

      {/* Rotating Quote */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuote.quote}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="absolute bottom-20 w-full max-w-md mx-auto px-6"
          dir="rtl"
        >
          <div className="text-center">
            <p className="text-gray-600 text-lg italic leading-relaxed">{currentQuote.quote}</p>
            <div className="text-sm font-semibold text-blue-600 mt-2">- {currentQuote.author}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


  // --- Error Screen ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-900 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="p-4 bg-red-500 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-gray-700 mb-5 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-full shadow hover:bg-blue-700 transition-all"
          >
            إعادة المحاولة
          </button>
        </motion.div>
      </div>
    )
  }

  if (!hasSeenWelcome && userProfile && userProfile.selected_city_id) {
  return (
    <WelcomeOnboardingModal
      isOpen={true}
      onFinish={handleFinishWelcome}
      version="v1"
    />
  );
}

  // --- City Selection ---
  if (userProfile && !userProfile.selected_city_id) {
    return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />
  }


  // --- App Layout ---
  return (
    <CacheProvider>
      <MiniCartProvider>
        <CartProvider user={telegramUser}>
          <SearchProvider cityId={userProfile?.selected_city_id}>
            <FilterProvider>
              <CheckoutProvider>
                <Outlet
                  context={{
                    telegramUser,
                    userProfile,
                    onProfileUpdate: fetchUserProfile,
                  }}
                />
              </CheckoutProvider>
            </FilterProvider>
          </SearchProvider>
        </CartProvider>
      </MiniCartProvider>
    </CacheProvider>
  )
}

export default AppInitializer
