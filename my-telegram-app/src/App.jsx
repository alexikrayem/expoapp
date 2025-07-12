// src/App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import MainPanel from './components/MainPanel';
import CitySelectionModal from './components/modals/CitySelectionModal';
import { userService } from './services/userService';

function App() {
    // We still keep telegramUser for display purposes (like the name)
    const [telegramUser, setTelegramUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserProfile = useCallback(async () => {
        try {
            // No more passing user.id! The apiClient handles the secure data.
            const profileData = await userService.getProfile();
            setUserProfile(profileData);
        } catch (err) {
            if (err.status === 404) {
                // The user is new. Create a temporary local profile.
                // The first update (like selecting a city) will create it on the backend.
                setUserProfile({ selected_city_id: null }); 
            } else {
                console.error("Profile fetch error:", err);
                setError('Could not load your profile. Please try refreshing.');
            }
        } finally {
            if (isLoading) setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        let user;
        if (tg) {
            tg.ready();
            tg.expand();
            // We get the unsafe user object for display purposes only.
            user = tg.initDataUnsafe?.user;
        }
        
        // For local development
        if (!user) {
            user = { id: 123456789, first_name: 'Local', last_name: 'Dev' };
        }
        
        setTelegramUser(user);
        fetchUserProfile();

    }, [fetchUserProfile]);

    const handleProfileUpdate = useCallback(() => {
        console.log("[App.jsx] A profile update was triggered. Refetching profile...");
        fetchUserProfile();
    }, [fetchUserProfile]);


    const handleCitySelect = async ({ cityId }) => {
        if (!telegramUser) return; // Should not happen, but good practice
        try {
            // The user is identified securely by the backend via initData
            const updatedProfile = await userService.updateProfile({ 
                selected_city_id: cityId 
            });
            setUserProfile(updatedProfile);
        } catch (err) {
            console.error(err);
            setError("Could not save your city selection. Please try again.");
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><p>Loading...</p></div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><p>{error}</p></div>;
    }
    if (userProfile && !userProfile.selected_city_id) {
        return <CitySelectionModal show={true} onCitySelect={handleCitySelect} />;
    }
    if (userProfile && userProfile.selected_city_id) {
        return (
            <div className="App">
                <MainPanel
                    telegramUser={telegramUser}
                    userProfile={userProfile}
                    onProfileUpdate={handleProfileUpdate}
                />
            </div>
        );
    }
    return null;
}

export default App;