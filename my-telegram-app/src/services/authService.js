import { setTokens } from '../api/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Use a getter function to allow tests to mock this value
const getIsDevelopment = () => {
  return typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
};

// Export the function for testing purposes
export { getIsDevelopment };

export const authService = {
    // Telegram Login Widget authentication
    telegramLoginWidget: async (authData) => {
        const headers = { 'Content-Type': 'application/json' };

        // In development mode, we send the bypass header
        if (IS_DEVELOPMENT) {
            headers['X-Dev-Bypass-Auth'] = import.meta.env.VITE_DEV_BYPASS_SECRET;
            console.log("Dev bypass header:", headers['X-Dev-Bypass-Auth']);
            console.log("API URL:", `${API_BASE_URL}/auth/telegram-login-widget`);
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

        // If the response contains tokens, store them
        if (data.accessToken && data.refreshToken) {
            setTokens(data.accessToken, data.refreshToken);
        }

        return data;
    },

    devBypassLogin: async () => {
        if (!getIsDevelopment()) {
            console.error('Development bypass login is only available in development mode.');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/auth/telegram-login-widget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        if (data.accessToken && data.refreshToken) {
            setTokens(data.accessToken, data.refreshToken);
        }

        return data;
    },

    // Check if user is authenticated (has valid tokens)
    isAuthenticated: () => {
        const accessToken = localStorage.getItem('accessToken');
        return !!accessToken;
    },

    // Get current user profile (using JWT tokens)
    getProfile: () => {
        // This will use the stored JWT tokens
        const { apiClient } = require('../api/apiClient');
        return apiClient('user/profile');
    }
};