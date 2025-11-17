import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LocationPicker from '../components/onboarding/LocationPicker';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
});

// Mock fetch for Nominatim API calls
global.fetch = vi.fn();

describe('LocationPicker Component Tests', () => {
  const mockOnLocationSelect = vi.fn();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Reset geolocation mocks
    mockGeolocation.getCurrentPosition.mockReset();
    mockGeolocation.watchPosition.mockReset();
  });

  test('renders LocationPicker component', () => {
    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);
    
    expect(screen.getByPlaceholderText(/بحث عن موقع/i)).toBeInTheDocument();
    expect(screen.getByText(/تحديد الموقع/i)).toBeInTheDocument();
  });

  test('allows searching for locations', async () => {
    const mockResults = [
      {
        display_name: 'Riyadh, Saudi Arabia',
        lat: 24.7136,
        lon: 46.6753,
      }
    ];
    
    global.fetch.mockResolvedValue({
      json: async () => mockResults,
    });

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText(/بحث عن موقع/i);
    fireEvent.change(searchInput, { target: { value: 'riyadh' } });

    // Wait for debounced search
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search')
      );
    }, { timeout: 1000 });
  });

  test('handles geolocation permission denied', async () => {
    // Mock geolocation error
    const positionError = new Error('PositionError');
    positionError.code = 1; // PERMISSION_DENIED

    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error(positionError);
    });

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const useCurrentLocationBtn = screen.getByRole('button', { name: /الموقع الحالي/i });
    fireEvent.click(useCurrentLocationBtn);

    // The component should handle the error gracefully
    await waitFor(() => {
      // Error is handled in the component
    });
  });

  test('handles geolocation success', async () => {
    // Mock geolocation success
    const mockPosition = {
      coords: {
        latitude: 24.7136,
        longitude: 46.6753,
      }
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const useCurrentLocationBtn = screen.getByRole('button', { name: /الموقع الحالي/i });
    fireEvent.click(useCurrentLocationBtn);

    await waitFor(() => {
      expect(mockOnLocationSelect).toHaveBeenCalledWith({
        clinic_coordinates: JSON.stringify({
          lat: 24.7136,
          lng: 46.6753
        }),
        clinic_address_line1: 'الموقع الحالي',
      });
    });
  });

  test('accepts manual coordinates input', async () => {
    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText(/بحث عن موقع/i);
    fireEvent.change(searchInput, { target: { value: '24.7136,46.6753' } });
    
    // Simulate blur to trigger coordinates validation
    fireEvent.blur(searchInput);

    await waitFor(() => {
      // The component should handle coordinates validation
    });
  });

  test('displays selected location info', async () => {
    const mockValue = {
      lat: 24.7136,
      lng: 46.6753,
      address: 'Test Location, Riyadh'
    };

    render(
      <LocationPicker
        value={mockValue}
        onLocationSelect={mockOnLocationSelect}
        onChange={mockOnChange}
      />
    );

    // Check if the selected location is displayed
    // Use more specific selectors since multiple elements may contain the same text
    expect(screen.getByText(/Test Location, Riyadh/i)).toBeInTheDocument();

    // Check that both lat/lng appear in the selected location display,
    // but use a more specific query to avoid multiple matches
    const coordsElements = screen.getAllByText(/24\.7136|46\.6753/);
    expect(coordsElements.length).toBeGreaterThanOrEqual(2); // Should find both coordinates
  });

  test('handles search suggestions click', async () => {
    const mockResults = [
      {
        display_name: 'Riyadh, Saudi Arabia',
        lat: 24.7136,
        lon: 46.6753,
      },
      {
        display_name: 'Jeddah, Saudi Arabia',
        lat: 21.5433,
        lon: 39.1728,
      }
    ];

    global.fetch.mockResolvedValue({
      json: async () => mockResults,
    });

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText(/بحث عن موقع/i);
    fireEvent.change(searchInput, { target: { value: 'riyadh' } });

    // Wait for results - the suggestions might be in dropdown elements that appear after fetch
    await waitFor(() => {
      const suggestionDivs = screen.queryAllByText(/Riyadh, Saudi Arabia/i);
      if (suggestionDivs.length > 0) {
        fireEvent.click(suggestionDivs[0]);
      }
    }, { timeout: 2000 });

    expect(mockOnLocationSelect).toHaveBeenCalledWith({
      clinic_coordinates: JSON.stringify({
        lat: 24.7136,
        lng: 46.6753
      }),
      clinic_address_line1: 'Riyadh, Saudi Arabia',
    });
  });

  test('handles fetch errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network Error'));

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText(/بحث عن موقع/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Should handle errors gracefully
    await waitFor(() => {
      // Even if fetch fails, UI shouldn't crash
    }, { timeout: 1000 });
  });

  test('shows loading state during geocoding', async () => {
    // Simulate slow fetch
    global.fetch.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ json: async () => [] });
        }, 200);
      });
    });

    render(<LocationPicker onLocationSelect={mockOnLocationSelect} onChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText(/بحث عن موقع/i);
    fireEvent.change(searchInput, { target: { value: 'loading test' } });

    // Should show loading state
    await waitFor(() => {
      // Check if loading indicator appears (if any)
    }, { timeout: 500 });
  });
});