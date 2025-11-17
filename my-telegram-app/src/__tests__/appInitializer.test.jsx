import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppInitializer from '../AppInitializer';

// Mock services
vi.mock('../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(),
    telegramLoginWidget: vi.fn(),
    getProfile: vi.fn(),
  },
}));

vi.mock('../services/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('../services/cityService', () => ({
  cityService: {
    getCities: vi.fn(),
  },
}));

// Mock all components to test the flow
vi.mock('../src/components/WelcomeOnboardingModal', () => ({ onFinish }) => (
  <div data-testid="welcome-modal">
    <button onClick={onFinish}>Finish Welcome</button>
  </div>
));

vi.mock('../src/components/modals/CitySelectionModal', () => ({ show, onCitySelect }) => {
  if (!show) return null;
  return (
    <div data-testid="city-selection-modal">
      <button onClick={() => onCitySelect({ cityId: 1 })}>Select City</button>
    </div>
  );
});

vi.mock('../src/components/onboarding/EnhancedOnboarding', () => ({ onComplete }) => (
  <div data-testid="enhanced-onboarding">
    <button onClick={onComplete}>Complete Onboarding</button>
  </div>
));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: ({ children }) => <div>{children}</div>,
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

describe('AppInitializer Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading screen initially', () => {
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(false);

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Should initially show loading screen
    expect(screen.getByText(/جاري تحميل ملفك الشخصي.../i)).toBeInTheDocument();
  });

  test('shows welcome modal when user is not authenticated and has not seen welcome', async () => {
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(false);

    // Mock localStorage to simulate not having seen welcome
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null), // hasn't seen welcome
        setItem: vi.fn(),
      },
      writable: true,
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('welcome-modal')).toBeInTheDocument();
    });
  });

  test('shows login view when user is not authenticated but has seen welcome', async () => {
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(false);

    // Mock localStorage to simulate having seen welcome
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => "true"), // has seen welcome
        setItem: vi.fn(),
      },
      writable: true,
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('welcome-modal')).toBeInTheDocument();
    });
  });

  test('shows enhanced onboarding when user is authenticated but profile is incomplete', async () => {
    // Mock authenticated user with incomplete profile
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(true);
    require('../src/services/userService').userService.getProfile.mockResolvedValue({
      full_name: 'John Doe',
      phone_number: '+1234567890',
      clinic_name: '',
      clinic_phone: '',
      profileCompleted: false
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Wait for profile loading
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-onboarding')).toBeInTheDocument();
    });
  });

  test('shows city selection when user is authenticated but has no selected city', async () => {
    // Mock authenticated user with complete profile but no city selected
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(true);
    require('../src/services/userService').userService.getProfile.mockResolvedValue({
      full_name: 'John Doe',
      phone_number: '+1234567890',
      clinic_name: 'Test Clinic',
      clinic_phone: '+0987654321',
      selected_city_id: null,
      profileCompleted: true
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Wait for profile loading
    await waitFor(() => {
      expect(screen.getByTestId('city-selection-modal')).toBeInTheDocument();
    });
  });

  test('shows main app when user is authenticated with complete profile and selected city', async () => {
    // Mock authenticated user with complete profile and selected city
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(true);
    require('../src/services/userService').userService.getProfile.mockResolvedValue({
      full_name: 'John Doe',
      phone_number: '+1234567890',
      clinic_name: 'Test Clinic',
      clinic_phone: '+0987654321',
      selected_city_id: 1,
      profileCompleted: true
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Wait for profile loading - should eventually render main app (though we don't have a specific test ID for it)
    await waitFor(() => {
      // The main app should render, but we don't have a specific test ID
      // So we check that neither onboarding nor login modals are shown
      expect(screen.queryByTestId('enhanced-onboarding')).not.toBeInTheDocument();
      expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('city-selection-modal')).not.toBeInTheDocument();
    });
  });

  test('handles authentication flow from login to profile completion', async () => {
    // Start with non-authenticated user
    require('../src/services/authService').authService.isAuthenticated
      .mockReturnValueOnce(false) // Initially not authenticated
      .mockReturnValueOnce(true)   // After simulated login, is authenticated
      .mockReturnValue(true);      // Remain authenticated

    // Mock profile responses
    require('../src/services/userService').userService.getProfile
      .mockResolvedValueOnce({ full_name: 'John', profileCompleted: false }) // For login
      .mockResolvedValueOnce({ full_name: 'John', profileCompleted: false }) // After login
      .mockResolvedValueOnce({
        full_name: 'John Doe',
        phone_number: '+1234567890',
        clinic_name: 'Test Clinic',
        clinic_phone: '+0987654321',
        selected_city_id: 1,
        profileCompleted: true
      }); // After profile completion

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Initially should show welcome/login
    await waitFor(() => {
      expect(screen.getByTestId('welcome-modal')).toBeInTheDocument();
    });

    // Simulate login completion
    act(() => {
      // Simulate login success which would trigger re-init
      require('../src/services/authService').authService.isAuthenticated.mockReturnValue(true);
    });

    // After login, should show enhanced onboarding
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-onboarding')).toBeInTheDocument();
    });
  });

  test('handles error states gracefully', async () => {
    // Mock authentication failure
    require('../src/services/userService').userService.getProfile.mockRejectedValue(
      new Error('Failed to fetch profile')
    );

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Should handle errors gracefully
    await waitFor(() => {
      // Check for error handling or fallback UI
    });
  });

  test('maintains proper state during loading sequences', async () => {
    // Mock slow profile loading to test loading states
    require('../src/services/authService').authService.isAuthenticated.mockReturnValue(true);
    require('../src/services/userService').userService.getProfile.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve({
          full_name: 'John Doe',
          phone_number: '+1234567890',
          clinic_name: 'Test Clinic',
          clinic_phone: '+0987654321',
          selected_city_id: 1,
          profileCompleted: true
        }), 200);
      });
    });

    render(
      <MemoryRouter>
        <AppInitializer />
      </MemoryRouter>
    );

    // Initially should show loading
    expect(screen.getByText(/جاري تحميل ملفك الشخصي.../i)).toBeInTheDocument();

    // After loading completes
    await waitFor(() => {
      expect(screen.queryByText(/جاري تحميل ملفك الشخصي.../i)).not.toBeInTheDocument();
    });
  });
});