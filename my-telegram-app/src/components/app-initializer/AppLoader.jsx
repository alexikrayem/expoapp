import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { userService } from "../../services/userService";
import { authService } from "../../services/authService";
import CitySelectionModal from "../modals/CitySelectionModal";
import EnhancedOnboarding from "../onboarding/EnhancedOnboarding";
import LoadingScreen from "./LoadingScreen";
import ErrorScreen from "./ErrorScreen";
import WelcomeFlow from "./WelcomeFlow";
import MainAppLayout from "./MainAppLayout";

const AppLoader = () => {
  const [telegramUser, setTelegramUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("تهيئة التطبيق...");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showEnhancedOnboarding, setShowEnhancedOnboarding] = useState(false); // For profile completion
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    try {
      return localStorage.getItem("hasSeenWelcome_v1") === "true";
    } catch {
      return false;
    }
  });

  // --- Helpers ---
  const fetchUserProfile = useCallback(async () => {
    try {
      setStep("تحميل ملفك الشخصي...");
      const profileData = await userService.getProfile();
      setUserProfile(profileData);

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
        setUserProfile({ selected_city_id: null });
        setTelegramUser(null);
      } else {
        setError("حدث خطأ أثناء تحميل ملفك الشخصي.");
      }
    } finally {
      setTimeout(() => setIsLoading(false), 1200);
    }
  }, []);

  // --- Initialize authentication and profile ---
  useEffect(() => {
    const init = async () => {
      setStep("Authenticating...");
      const isAuthenticated = authService.isAuthenticated();

      if (!isAuthenticated) {
        // If not authenticated, we'll show the welcome flow
        setIsLoading(false);
        return;
      }

      // ONLY fetch the profile if login was successful
      await fetchUserProfile();
    };
    init();
  }, [fetchUserProfile]);

  // After fetching profile, check if profile is completed
  useEffect(() => {
    if (userProfile) {
      // If profileCompleted is explicitly false OR if it doesn't exist and user doesn't have required clinic info
      const isProfileIncomplete = userProfile.profileCompleted === false ||
                                 (userProfile.profileCompleted === undefined &&
                                  (!userProfile.clinic_name || !userProfile.clinic_phone));
      if (isProfileIncomplete) {
        setShowEnhancedOnboarding(true);
      }
    }
  }, [userProfile]);

  // --- Cycle quotes while loading ---
  const dentistQuotes = [
    { quote: "كل سن في رأس الرجل أثمن من الماس.", author: "ميغيل دي ثيربانتس" },
    { quote: "صحة الفم هي نافذة على صحتك العامة.", author: "سي. إيفرت كوب" },
    { quote: "الابتسامة هي انحناءة تجعل كل شيء مستقيمًا.", author: "فيليس ديلر" },
    { quote: "الفم هو بوابة الجسم.", author: "مجهول" },
    { quote: "أسنان صحية، جسم سليم.", author: "مثل شعبي" },
    { quote: "الوقاية خير من العلاج، خاصة في طب الأسنان.", author: "مقولة شائعة" },
  ];

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % dentistQuotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleCitySelect = async ({ cityId }) => {
    try {
      setStep("حفظ اختيار المدينة...");
      const updatedProfile = await userService.updateProfile({ selected_city_id: cityId });
      setUserProfile(updatedProfile);
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success");
    } catch {
      setError("حدث خطأ أثناء حفظ اختيار المدينة.");
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("error");
    }
  };

  // Handle completion of enhanced onboarding
  const handleEnhancedOnboardingComplete = () => {
    setShowEnhancedOnboarding(false);
    // Reset to allow the app to continue with normal flow
    setIsLoading(true);
    fetchUserProfile(); // Refetch profile with updated info
  };

  // Handle skipping enhanced onboarding (for now)
  const handleEnhancedOnboardingSkip = () => {
    setShowEnhancedOnboarding(false);
    // User skipped, but for dental supplies we might want to enforce completion
    // For now, let them continue but they might be prompted again later
  };

  // Handle finishing the welcome flow
  const handleFinishWelcome = () => {
    try {
      localStorage.setItem("hasSeenWelcome_v1", "true");
    } catch {}
    setHasSeenWelcome(true);
  };

  // Handle successful login from welcome flow
  const handleLoginSuccess = async () => {
    setIsLoading(true);
    setError(null);
    setTelegramUser(null);
    setUserProfile(null);

    const reinit = async () => {
      setStep("Authenticating...");
      const isAuthenticated = authService.isAuthenticated();
      if (isAuthenticated) {
        // Fetch profile to check if it's completed
        await fetchUserProfile();

        // If profile is not completed, show enhanced onboarding
        // Otherwise continue with normal flow
      } else {
        setError("فشل التحقق من تسجيل الدخول. الرجاء المحاولة مرة أخرى.");
        setIsLoading(false);
      }
    };
    reinit();
  };

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen step={step} quoteIndex={quoteIndex} />;
  }

  // Show error screen
  if (error) {
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  // Show enhanced onboarding if needed
  if (showEnhancedOnboarding) {
    return (
      <EnhancedOnboarding
        onComplete={handleEnhancedOnboardingComplete}
        onSkip={handleEnhancedOnboardingSkip}
      />
    );
  }

  // Show welcome flow if not authenticated
  if (!authService.isAuthenticated()) {
    return (
      <WelcomeFlow
        hasSeenWelcome={hasSeenWelcome}
        onFinishWelcome={handleFinishWelcome}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Show city selection if needed
  if (userProfile && !userProfile.selected_city_id) {
    return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />;
  }

  // Show main app layout
  return (
    <MainAppLayout
      telegramUser={telegramUser}
      userProfile={userProfile}
      onProfileUpdate={fetchUserProfile}
    />
  );
};

export default AppLoader;