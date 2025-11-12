"use client"

import { useEffect, useState, useCallback } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { userService } from "./services/userService"
import { authService } from "./services/authService"
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
  const [showLoginView, setShowLoginView] = useState(false) // New state for login view

  // --- Helpers ---
  const fetchUserProfile = useCallback(async () => {
    try {
      setStep("تحميل ملفك الشخصي...")
      const profileData = await userService.getProfile()
      setUserProfile(profileData)
      
      // Set telegramUser data from profile if available
      // The backend may return different field names depending on auth method
      const userId = profileData?.userId || profileData?.id || profileData?.user_id;
      if (profileData && userId) {
        setTelegramUser({
          id: userId,
          first_name: profileData.full_name?.split(' ')[0] || profileData.first_name || profileData.firstName || 'User',
          last_name: profileData.full_name?.split(' ').slice(1).join(' ') || profileData.last_name || profileData.lastName || '',
        });
      } else {
        // If profile data exists but no userId, the user may be logged in but profile is incomplete
        console.warn("Profile fetched but no userId found:", profileData);
        setError("فشل في تحميل معلومات المستخدم. يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      if (err.status === 404) {
        setUserProfile({ selected_city_id: null })
        setTelegramUser(null);
      } else {
        setError("حدث خطأ أثناء تحميل ملفك الشخصي.")
      }
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

  // --- Initialize authentication and profile ---
  useEffect(() => {
    const init = async () => {
      setStep("Authenticating...");
      const isAuthenticated = authService.isAuthenticated();
      
      if (!isAuthenticated) {
        // If not authenticated, decide whether to show slides or login
        if (!hasSeenWelcome) {
          setShowOnboarding(true); // Show welcome slides first
        } else {
          setShowLoginView(true); // Otherwise, show login directly
        }
        setIsLoading(false);
        return;
      }

      // ONLY fetch the profile if login was successful
      await fetchUserProfile();
    };
    init();
  }, [fetchUserProfile]); // <-- Removed hasSeenWelcome dependency

  // --- Cycle quotes while loading ---
  useEffect(() => {
    if (!isLoading) return
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % dentistQuotes.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isLoading])


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

  // Handle finishing the welcome slides
  const handleFinishWelcome = () => {
    try {
      localStorage.setItem("hasSeenWelcome_v1", "true");
    } catch {}
    setHasSeenWelcome(true);
    // After finishing slides, transition to the login view
    setShowOnboarding(false);
    setShowLoginView(true);
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    setShowLoginView(false);
    setIsLoading(true);
    setError(null);
    setTelegramUser(null);
    setUserProfile(null);

    const reinit = async () => {
      setStep("Authenticating...");
      const isAuthenticated = authService.isAuthenticated();
      if (isAuthenticated) {
        await fetchUserProfile();
      } else {
        setError("فشل التحقق من تسجيل الدخول. الرجاء المحاولة مرة أخرى.");
        setIsLoading(false);
      }
    };
    reinit();
  };


  // --- Loading Screen ---
  if (isLoading) {
    const currentQuote = dentistQuotes[quoteIndex]
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center text-gray-800 px-6 font-sans relative"
        style={{
          background: "linear-gradient(to top, #e6f4ff 0%, #ffffff 70%)", // icy blue -> white
        }}
      >
        <motion.img
          src={appLogoImage}
          alt="App Logo"
          className="w-40 h-40 object-contain mb-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.h1
          className="text-3xl font-extrabold mb-4 text-gray-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          معرض المستلزمات الطبية
        </motion.h1>
        <motion.div
          className="flex items-center gap-3 text-gray-700 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-base font-medium">{step}</span>
        </motion.div>
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
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
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
  
  // --- Onboarding & Login Flow for Unauthenticated Users ---
  
  // 1. Show Welcome Slides if they haven't been seen
  if (showOnboarding) {
    return (
      <WelcomeOnboardingModal
        isOpen={true}
        onFinish={handleFinishWelcome}
        version="v1"
        showLogin={false} // Explicitly show slides
      />
    );
  }

  // 2. Show Login View if slides are done or were already seen
  if (showLoginView) {
    return (
      <WelcomeOnboardingModal
        isOpen={true}
        onFinish={handleLoginSuccess}
        version="v1"
        showLogin={true} // Explicitly show login
      />
    );
  }

  // --- City Selection (for Authenticated Users) ---
  if (userProfile && !userProfile.selected_city_id) {
    return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />
  }

  // --- App Layout (for Authenticated Users) ---
  return (
    <CacheProvider>
      <MiniCartProvider>
        <CartProvider user={telegramUser || (userProfile ? {id: userProfile.userId} : null)}>
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