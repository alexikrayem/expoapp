import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_500Medium } from '@expo-google-fonts/inter';
import { Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/context/AuthContext';
import { CacheProvider } from '@/context/CacheContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ModalProvider } from '@/context/ModalContext';
import { CartProvider } from '@/context/CartContext';
import { CheckoutProvider } from '@/context/CheckoutContext';
import { MiniCartProvider } from '@/context/MiniCartContext';
import { SearchProvider } from '@/context/SearchContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import WelcomeOnboardingModal from '@/components/modals/WelcomeOnboardingModal';
import EnhancedOnboardingModal from '@/components/modals/EnhancedOnboardingModal';
import OfflineOverlay from '@/components/OfflineOverlay';
import { emitter } from '@/utils/emitter';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      emitter.emit('api-error', error.message || 'حدث خطأ في الاتصال');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      emitter.emit('api-error', error.message || 'حدث خطأ في العملية');
    },
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    TajawalCustom: require('../assets/fonts/Tajawal-Regular.ttf'),
    Montserrat_Bold: require('../assets/fonts/Montserrat-Arabic SemiBold 600.otf'),
    MontserratArabic_Bold: require('../assets/fonts/Montserrat-Arabic SemiBold 600.otf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();

      // Set default font for all Text components using defaultProps
      const { Text } = require('react-native');
      const defaultFontFamily = { fontFamily: 'TajawalCustom' };

      // Store original defaultProps
      const oldDefaultProps = Text.defaultProps;
      Text.defaultProps = {
        ...(oldDefaultProps || {}),
        style: [defaultFontFamily, oldDefaultProps?.style],
      };
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <CacheProvider>
            <CurrencyProvider>
              <MiniCartProvider>
                <CartProvider>
                  <SearchProvider>
                    <ModalProvider>
                      <CheckoutProvider>
                        <RootLayoutNav />
                      </CheckoutProvider>
                    </ModalProvider>
                  </SearchProvider>
                </CartProvider>
              </MiniCartProvider>
            </CurrencyProvider>
          </CacheProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme } = useColorScheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome_v1');
        if (!hasSeenWelcome) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  useEffect(() => {
    const onError = (message: string) => {
      // Avoid showing too many toasts for background fetches
      // We could filter here if needed, but for now show all errors
      showToast(message, 'error');
    };
    emitter.on('api-error', onError);
    return () => {
      emitter.off('api-error', onError);
    };
  }, [showToast]);

  const [showEnhancedOnboarding, setShowEnhancedOnboarding] = useState(false);

  const handleOnboardingFinish = () => {
    setShowOnboarding(false);
    // Show enhanced onboarding after welcome flow
    setShowEnhancedOnboarding(true);
  };

  const handleEnhancedOnboardingFinish = () => {
    setShowEnhancedOnboarding(false);
    showToast('تم تحديث الملف الشخصي بنجاح', 'success');
  };

  const handleEnhancedOnboardingSkip = () => {
    setShowEnhancedOnboarding(false);
  };

  if (checkingOnboarding) {
    return null; // Or a loading screen
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OfflineOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
      </Stack>

      <WelcomeOnboardingModal
        visible={showOnboarding}
        onFinish={handleOnboardingFinish}
      />
      <EnhancedOnboardingModal
        visible={showEnhancedOnboarding}
        onFinish={handleEnhancedOnboardingFinish}
        onSkip={handleEnhancedOnboardingSkip}
      />
    </ThemeProvider>
  );
}
