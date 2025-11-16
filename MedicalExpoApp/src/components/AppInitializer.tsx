import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import CitySelectionModal from './CitySelectionModal';
import WelcomeOnboardingModal from './WelcomeOnboardingModal';

// Import all context providers
import { AppProvider } from '../context/AppContext';
import { CacheProvider } from '../context/CacheContext';
import { CartProvider } from '../context/CartContext';
import { CheckoutProvider } from '../context/CheckoutContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { FilterProvider } from '../context/FilterContext';
import { MiniCartProvider } from '../context/MiniCartContext';
import { ModalProvider } from '../context/ModalContext';
import { SearchProvider } from '../context/SearchContext';

const dentistQuotes = [
  { quote: "كل سن في رأس الرجل أثمن من الماس.", author: "ميغيل دي ثيربانتس" },
  { quote: "صحة الفم هي نافذة على صحتك العامة.", author: "سي. إيفرت كوب" },
  { quote: "الابتسامة هي انحناءة تجعل كل شيء مستقيمًا.", author: "فيليس ديلر" },
  { quote: "الفم هو بوابة الجسم.", author: "مجهول" },
  { quote: "أسنان صحية، جسم سليم.", author: "مثل شعبي" },
  { quote: "الوقاية خير من العلاج، خاصة في طب الأسنان.", author: "مقولة شائعة" },
];

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("Initializing app...");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoginView, setShowLoginView] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      setStep("Loading your profile...");
      const response = await userService.getProfile();
      if (response.success) {
        const profileData = response.data;
        setUserProfile(profileData);

        // If profile data exists but no selected_city_id, the user needs to select a city
        if (!profileData.selected_city_id) {
          // User needs to select a city
        }
      } else {
        throw new Error(response.error || 'Failed to fetch profile');
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      // If error status is 404 (user not found), set a default profile state
      if (err.status === 404) {
        setUserProfile({ selected_city_id: null });
      } else {
        setError(err.message || "An error occurred while loading your profile.");
      }
    } finally {
      setTimeout(() => setIsLoading(false), 1200);
    }
  }, []);

  // Check if user has seen welcome screen using AsyncStorage
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(false);

  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const welcomeStatus = await authService.isAuthenticated();
        // In our case, we'll consider the user as having seen welcome if they're authenticated
        setHasSeenWelcome(welcomeStatus);
      } catch {
        setHasSeenWelcome(false);
      }
    };
    checkWelcomeStatus();
  }, []);

  // Initialize authentication and profile
  useEffect(() => {
    const init = async () => {
      setStep("Authenticating...");
      const isAuthenticated = await authService.isAuthenticated();

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
  }, [fetchUserProfile, hasSeenWelcome]);

  // Cycle quotes while loading
  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % dentistQuotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleCitySelect = async (cityId: string) => {
    try {
      setStep("Saving city selection...");
      const response = await userService.updateProfile({ selected_city_id: cityId });
      if (response.success) {
        setUserProfile(response.data);
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving city selection.");
    }
  };

  // Handle finishing the welcome slides
  const handleFinishWelcome = () => {
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
    setUserProfile(null);

    const reinit = async () => {
      setStep("Authenticating...");
      const isAuthenticated = await authService.isAuthenticated();
      if (isAuthenticated) {
        await fetchUserProfile();
      } else {
        setError("Login verification failed. Please try again.");
        setIsLoading(false);
      }
    };
    reinit();
  };

  // Loading Screen
  if (isLoading) {
    const currentQuote = dentistQuotes[quoteIndex];
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>معرض المستلزمات الطبية</Text>
        <View style={styles.loadingInfo}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{step}</Text>
        </View>
        <Text style={styles.quote}>{currentQuote.quote}</Text>
        <Text style={styles.quoteAuthor}>- {currentQuote.author}</Text>
      </View>
    );
  }

  // Error Screen
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorText}>Please try again.</Text>
        </View>
      </View>
    );
  }

  // Show Welcome Slides if they haven't been seen
  if (showOnboarding) {
    return (
      <WelcomeOnboardingModal
        isOpen={true}
        onFinish={handleFinishWelcome}
        showLogin={false} // Show slides
      />
    );
  }

  // Show Login View if slides are done or were already seen
  if (showLoginView) {
    return (
      <WelcomeOnboardingModal
        isOpen={true}
        onFinish={handleLoginSuccess}
        showLogin={true} // Show login
      />
    );
  }

  // City Selection (for Authenticated Users)
  if (userProfile && !userProfile.selected_city_id) {
    return <CitySelectionModal onCitySelect={handleCitySelect} />;
  }

  // App content (for Authenticated Users with selected city)
  // Wrap with all necessary providers
  const appValue = {
    user: userProfile || null,
    cityId: userProfile?.selected_city_id || '1',
  };

  return (
    <AppProvider value={appValue}>
      <CacheProvider>
        <CartProvider>
          <CheckoutProvider>
            <CurrencyProvider>
              <FilterProvider>
                <MiniCartProvider>
                  <ModalProvider>
                    <SearchProvider cityId={appValue.cityId}>
                      {children}
                    </SearchProvider>
                  </ModalProvider>
                </MiniCartProvider>
              </FilterProvider>
            </CurrencyProvider>
          </CheckoutProvider>
        </CartProvider>
      </CacheProvider>
    </AppProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  loadingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#666',
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#555',
    marginBottom: 5,
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
});

export default AppInitializer;