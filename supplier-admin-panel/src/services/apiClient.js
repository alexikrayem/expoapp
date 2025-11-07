// src/services/apiClient.js - Enhanced API client with better error handling and dual token support
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001';

// Token storage functions
const getAccessToken = () => localStorage.getItem('supplierAccessToken');
const getRefreshToken = () => localStorage.getItem('supplierRefreshToken');
const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('supplierAccessToken', accessToken);
    localStorage.setItem('supplierRefreshToken', refreshToken);
};
const clearTokens = () => {
    localStorage.removeItem('supplierAccessToken');
    localStorage.removeItem('supplierRefreshToken');
    localStorage.removeItem('supplierInfo');
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
        window.location.href = '/login';
        throw error;
    }
};

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Increased timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const accessToken = getAccessToken();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add request logging in development
        if (import.meta.env.DEV) {
            console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                data: config.data,
                params: config.params
            });
        }

        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for better error handling and token refresh
apiClient.interceptors.response.use(
    (response) => {
        // Check if the response contains new tokens (e.g., login response)
        if (response.data && response.data.accessToken && response.data.refreshToken) {
            setTokens(response.data.accessToken, response.data.refreshToken);
        }
        
        // Log successful responses in development
        if (import.meta.env.DEV) {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data
            });
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log errors in development
        if (import.meta.env.DEV) {
            console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        }

        // If 401 error and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await refreshAccessToken();
                
                // Retry the original request with the new access token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                clearTokens();
                // Show user-friendly message
                alert('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');
                // Redirect to login
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        if (error.response?.status === 401) {
            // Token expired or invalid
            clearTokens();

            // Show user-friendly message
            alert('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.');

            // Redirect to login
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Format error message for better user experience
        let errorMessage = 'حدث خطأ غير متوقع';

        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            if (error.message.includes('Network Error')) {
                errorMessage = 'خطأ في الاتصال. تحقق من اتصال الإنترنت.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'انتهى وقت الطلب. يرجى المحاولة مرة أخرى.';
            } else {
                errorMessage = error.message;
            }
        }

        // Create enhanced error object
        const enhancedError = new Error(errorMessage);
        enhancedError.status = error.response?.status;
        enhancedError.code = error.response?.data?.code;
        enhancedError.originalError = error;

        return Promise.reject(enhancedError);
    }
);

export default apiClient;