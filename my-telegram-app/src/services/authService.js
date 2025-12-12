import { setTokens } from '../api/apiClient';
import { isAccessTokenValid } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authService = {
    // Telegram Login Widget authentication
    telegramLoginWidget: async (authData) => {
        const headers = { 'Content-Type': 'application/json' };

        // Check if running in React Native WebView
        if (window.ReactNativeWebView) {
            headers['X-Client-Type'] = 'mobile';
        }

        // Call the telegram-login-widget endpoint
        const response = await fetch(`${API_BASE_URL}/auth/telegram-login-widget`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ authData }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        // If the response contains tokens, store them (refreshToken is HttpOnly cookie now)
        if (data.accessToken) {
            setTokens(data.accessToken);
        }

        return data;
    },

    // Check if user is authenticated (has valid tokens)
    isAuthenticated: () => {
        return isAccessTokenValid();
    },

    // Get current user profile (using JWT tokens)
    getProfile: () => {
        // This will use the stored JWT tokens
        const { apiClient } = require('../api/apiClient');
        return apiClient('user/profile');
    }
};