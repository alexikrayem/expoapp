import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { getAccessToken, clearTokens } from '@/api/apiClient';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userProfile: any;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    const fetchProfile = async () => {
        try {
            const profile = await userService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('[AuthContext] Failed to fetch profile:', error);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check if we have a valid token
                const token = await getAccessToken();
                if (token) {
                    setIsAuthenticated(true);
                    await fetchProfile();
                } else {
                    // If no token and in dev mode, try bypass login
                    if (__DEV__) {
                        console.log('[AuthContext] Attempting dev bypass login...');
                        try {
                            await authService.devBypassLogin();
                            setIsAuthenticated(true);
                            await fetchProfile();
                            console.log('[AuthContext] Dev bypass login successful');
                        } catch (err) {
                            console.error('[AuthContext] Dev bypass login failed:', err);
                        }
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Auth initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async () => {
        setIsLoading(true);
        try {
            // In development, use the bypass login
            if (__DEV__) {
                console.log('[AuthContext] Initiating dev bypass login...');
                await authService.devBypassLogin();
            } else {
                // Production: Use WebBrowser flow
                console.log('[AuthContext] Initiating production Telegram login...');
                await authService.loginWithTelegram();
            }

            setIsAuthenticated(true);
            await fetchProfile();
            console.log('[AuthContext] Login successful');
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await clearTokens();
        setIsAuthenticated(false);
        setUserProfile(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, userProfile, login, logout, refreshProfile: fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
