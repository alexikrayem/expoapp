import React, { useState, useEffect, useCallback } from 'react';

const LocationPicker = ({ value, onChange, onLocationSelect }) => {
  const [selectedLocation, setSelectedLocation] = useState(value || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simple geocoding using Nominatim (free OpenStreetMap service)
  const geocodeAddress = async (query) => {
    if (!query.trim()) return [];
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=SA`
      );
      const results = await response.json();
      
      // Format results for our use
      return results.map(result => ({
        display_name: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        address: result.display_name
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    if (searchQuery.trim().length > 3) {
      const timeoutId = setTimeout(() => {
        geocodeAddress(searchQuery).then(setSuggestions);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSuggestionSelect = (suggestion) => {
    const newLocation = {
      lat: suggestion.lat,
      lng: suggestion.lon,
      address: suggestion.display_name
    };
    
    setSelectedLocation(newLocation);
    setShowSuggestions(false);
    setSearchQuery('');
    
    // Update form data
    if (onLocationSelect) {
      onLocationSelect({
        clinic_coordinates: JSON.stringify({ lat: suggestion.lat, lng: suggestion.lon }),
        clinic_address_line1: suggestion.display_name || '',
      });
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'الموقع الحالي'
          };
          setSelectedLocation(newLocation);
          
          // Update form data
          if (onLocationSelect) {
            onLocationSelect({
              clinic_coordinates: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
              clinic_address_line1: 'الموقع الحالي',
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          if (error.code === 1) {
            // PERMISSION_DENIED
            alert('تم رفض إذن الموقع. يرجى التأكد من أنك سمحت للموقع بالوصول إلى موقعك.');
          } else if (error.code === 2) {
            // POSITION_UNAVAILABLE
            alert('لا يمكن تحديد الموقع حاليًا. يرجى المحاولة لاحقًا.');
          } else if (error.code === 3) {
            // TIMEOUT
            alert('انتهى وقت محاولة تحديد الموقع. يرجى المحاولة مرة أخرى.');
          } else {
            alert('فشل في تحديد الموقع. يرجى التأكد من أن خدمات الموقع مفعلة.');
          }
        }
      );
    } else {
      alert('متصفحك لا يدعم تحديد الموقع الجغرافي.');
    }
  };

  // Handle manual input of coordinates
  const handleCoordinatesInput = (value) => {
    const coords = value.split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0].trim());
      const lng = parseFloat(coords[1].trim());
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const newLocation = {
          lat: lat,
          lng: lng,
          address: `الإحداثيات: ${lat}, ${lng}`
        };
        
        setSelectedLocation(newLocation);
        
        // Update form data
        if (onLocationSelect) {
          onLocationSelect({
            clinic_coordinates: JSON.stringify({ lat, lng }),
            clinic_address_line1: `الإحداثيات: ${lat}, ${lng}`,
          });
        }
        return true;
      }
    }
    return false;
  };

  const handleManualInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Check if it's a coordinates format (lat, lng)
    if (value.includes(',')) {
      const success = handleCoordinatesInput(value);
      if (success) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-right text-sm font-medium text-gray-700 mb-2">
          موقع العيادة على الخريطة
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleManualInput}
            placeholder="ابحث عن موقع العيادة أو أدخل الإحداثيات (31.2357,30.0444)"
            className="onboarding-input w-full pr-10"
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => searchQuery && geocodeAddress(searchQuery).then(setSuggestions)}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        </div>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="p-3 hover:bg-gray-100 cursor-pointer text-right border-b border-gray-100 last:border-b-0"
              >
                {suggestion.display_name}
              </div>
            ))}
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="mr-2 text-xs text-gray-600">جاري البحث...</span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">تحديد الموقع</span>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            الموقع الحالي
          </button>
        </div>
        
        {/* Simplified approach - no actual map, just location display */}
        <div className="w-full h-40 rounded-lg border border-gray-300 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {selectedLocation ? (
              <div>
                <p className="text-sm text-gray-700">تم تحديد الموقع</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedLocation.lat?.toFixed(4)}, {selectedLocation.lng?.toFixed(4)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">حدد الموقع باستخدام البحث أو زر الموقع الحالي</p>
            )}
          </div>
        </div>
      </div>

      {selectedLocation && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="text-sm text-gray-700 text-right">
            <div className="font-medium mb-1">الموقع المحدد:</div>
            <div className="flex justify-between">
              <span>الإحداثيات: </span>
              <span>{selectedLocation.lat?.toFixed(6)}, {selectedLocation.lng?.toFixed(6)}</span>
            </div>
            {selectedLocation.address && (
              <div className="mt-1 flex justify-between">
                <span>العنوان: </span>
                <span>{selectedLocation.address}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;