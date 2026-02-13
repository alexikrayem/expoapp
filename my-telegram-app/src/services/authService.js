import { isAccessTokenValid } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authService = {
    // --- Phone Number OTP Auth ---

    sendOtp: async (phoneNumber) => {
        const { apiClient } = await import('../api/apiClient');
        return await apiClient('auth/send-otp', {
            method: 'POST',
            body: { phone_number: phoneNumber },
        });
    },

    verifyOtp: async (phoneNumber, code) => {
        const { apiClient, setTokens } = await import('../api/apiClient');
        const data = await apiClient('auth/verify-otp', {
            method: 'POST',
            body: { phone_number: phoneNumber, code },
        });

        // If it's an existing user (isNew: false), tokens are returned
        if (data.accessToken) {
            setTokens(data.accessToken);
        }
        return data;
    },

    registerWithPhone: async (phoneNumber, code, profileData) => {
        const { apiClient, setTokens } = await import('../api/apiClient');
        const data = await apiClient('auth/register-phone', {
            method: 'POST',
            body: { phone_number: phoneNumber, code, profileData },
        });

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
    getProfile: async () => {
        const { apiClient } = await import('../api/apiClient');
        return apiClient('user/profile');
    },

    // Logout and revoke refresh token server-side
    logout: async () => {
        const { apiClient, clearTokens } = await import('../api/apiClient');
        try {
            await apiClient('auth/logout', { method: 'POST' });
        } catch (error) {
            // Even if logout fails, clear local tokens
            console.error('Logout error:', error);
        } finally {
            clearTokens();
        }
    }
};
