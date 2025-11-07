// src/api/adminApiClient.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3001';

// Token storage functions
const getAccessToken = () => localStorage.getItem('adminAccessToken');
const getRefreshToken = () => localStorage.getItem('adminRefreshToken');
const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('adminAccessToken', accessToken);
    localStorage.setItem('adminRefreshToken', refreshToken);
};
const clearTokens = () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
};

// Token refresh function
const refreshAccessToken = async () => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
            }
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        setTokens(accessToken, newRefreshToken);
        return accessToken;
    } catch (error) {
        console.error('Token refresh error:', error);
        clearTokens();
        // Optionally redirect to login page
        window.location.href = '/admin/login';
        throw error;
    }
};

// Create axios instance
const adminApiClient = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add access token
adminApiClient.interceptors.request.use(
    (config) => {
        const accessToken = getAccessToken();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 and token refresh
adminApiClient.interceptors.response.use(
    (response) => {
        // Check if the response contains new tokens (e.g., login response)
        if (response.data && response.data.accessToken && response.data.refreshToken) {
            setTokens(response.data.accessToken, response.data.refreshToken);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If 401 error and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await refreshAccessToken();
                
                // Retry the original request with the new access token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return adminApiClient(originalRequest);
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export { adminApiClient, setTokens, clearTokens, getAccessToken, getRefreshToken };