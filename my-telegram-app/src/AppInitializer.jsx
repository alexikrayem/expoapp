// src/AppInitializer.jsx (PLATFORM-AGNOSTIC VERSION)
import React, { useEffect, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { userService } from './services/userService';
import CitySelectionModal from './components/modals/CitySelectionModal';
import { SearchProvider } from './context/SearchContext';

const AppInitializer = () => {
    const [telegramUser, setTelegramUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserProfile = useCallback(async () => {
        try {
            const profileData = await userService.getProfile();
            setUserProfile(profileData);
        } catch (err) {
            if (err.status === 404) {
                setUserProfile({ selected_city_id: null }); 
            } else {
                console.error("Profile fetch error:", err);
                setError('Could not load your profile. Please try refreshing.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // This useEffect now only handles initial setup and user fetching.
    useEffect(() => {
        // Ensure scrolling is enabled for the body.
        document.body.style.overflow = 'auto';

        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            // We still call expand() to make sure the app takes up the full screen inside Telegram.
            tg.expand();
        }
        
        // The user object is still useful for display purposes (name, photo).
        const user = tg?.initDataUnsafe?.user || { id: 123456789, first_name: 'Local', last_name: 'Dev' };
        setTelegramUser(user);
        
        // Set loading to true before fetching.
        setIsLoading(true);
        fetchUserProfile();

    }, [fetchUserProfile]); // This effect still runs only once on mount.

    const handleCitySelect = async ({ cityId }) => {
        try {
            const updatedProfile = await userService.updateProfile({ selected_city_id: cityId });
            setUserProfile(updatedProfile);
        } catch (err)
        {
            console.error(err);
            setError("Could not save your city selection. Please try again.");
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><p>Loading App...</p></div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><p>{error}</p></div>;
    }
    if (userProfile && !userProfile.selected_city_id) {
        return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />;
    }
    
   return (
        // FIX: Wrap the Outlet in the SearchProvider and pass it the cityId
        <SearchProvider cityId={userProfile?.selected_city_id}>
            <Outlet context={{ telegramUser, userProfile, onProfileUpdate: fetchUserProfile }} />
        </SearchProvider>
    );
};

export default AppInitializer;