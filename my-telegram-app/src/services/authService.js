import { setTokens } from '../api/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEVELOPMENT = import.meta.env.DEV; // Vite provides this boolean

export const authService = {
    // Telegram native authentication - parse initData from WebApp SDK
    telegramNativeLogin: async () => {
        // Get Telegram init data
        const tg = window.Telegram?.WebApp;
        const headers = { 'Content-Type': 'application/json' };
        
        // In development mode, we send the bypass header regardless
        if (IS_DEVELOPMENT) {
            headers['X-Dev-Bypass-Auth'] = import.meta.env.VITE_DEV_BYPASS_SECRET;
            console.log("Dev bypass header:", headers['X-Dev-Bypass-Auth']);
            console.log("API URL:", `${API_BASE_URL}/auth/telegram-native`);
        }
        
        let auth_data = {};
        if (!tg || !tg.initData) {
            console.log('DEV MODE: No Telegram WebApp data available, using mock data');
            // In pure development mode without Telegram, use mock data
            auth_data = { 
                id: 123456789, 
                first_name: 'Local', 
                last_name: 'Dev',
                hash: 'mock_hash_for_dev_mode' // This is required but will be bypassed by the backend
            };
        } else {
            // Parse the initData string which is in query string format like:
            // "user=%7B%22id%22%3A123%2C%22first_name%22...%7D&chat=%7B%22id%22%3A...%7D&hash=abc123"
            const params = new URLSearchParams(tg.initData);
            
            // Parse each parameter
            for (const [key, value] of params) {
                try {
                    // Some parameters like 'user', 'chat', 'receiver', 'start_param' are JSON strings that need to be parsed
                    if (['user', 'chat', 'receiver'].includes(key)) {
                        auth_data[key] = JSON.parse(decodeURIComponent(value));
                    } else {
                        // Other parameters like 'hash', 'auth_date' are plain strings
                        auth_data[key] = value;
                    }
                } catch (e) {
                    // If JSON parsing fails, store as plain string
                    auth_data[key] = value;
                }
            }
        }
        
        // Call the telegram-native endpoint directly (not using apiClient to avoid conflict)
        const response = await fetch(`${API_BASE_URL}/auth/telegram-native`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ auth_data }),
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

