import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { getAccessToken, clearTokens } from '@/api/apiClient';
import { ensureValidToken } from '@/utils/tokenManager';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userProfile: any;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshAuth: () => Promise<void>;
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
            // If profile fetch fails (likely due to auth error despite valid token check), ensure we logout
            // checking if error is related to auth could be better, but for safety:
            throw error;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check if we have any token at all
                const currentToken = await getAccessToken();

                if (!currentToken) {
                    // Scenario 1: No token found. GRACEFUL EXIT.
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    return; // 🎯 Crucial to exit here to avoid calling protected API routes
                }

                // Scenario 2: Token found. Attempt to re-authenticate.
                try {
                    await ensureValidToken();
                    await fetchProfile();
                    setIsAuthenticated(true);
                } catch (error) {
                    // Token invalid/expired beyond refresh. Reset session.
                    await logout();
                }
            } catch (error) {
                // General error. Reset session.
                await logout();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async () => {
        setIsLoading(true);
        try {
            // ALWAYS use the production Telegram login flow to ensure consistency
            // This ensures we test the real auth flow even in development
            console.log('[AuthContext] Initiating Telegram login...');
            await authService.loginWithTelegram();

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

    // Refresh auth state from existing tokens (used after WebView login)
    const refreshAuth = async () => {
        setIsLoading(true);
        try {
            const token = await getAccessToken();
            if (token) {
                setIsAuthenticated(true);
                await fetchProfile();
            }
        } catch (error) {
            console.error('[AuthContext] refreshAuth failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, userProfile, login, logout, refreshProfile: fetchProfile, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
};


