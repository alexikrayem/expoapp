// src/services/apiClient.js - Enhanced API client with better error handling
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Increased timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('supplierToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor for better error handling
apiClient.interceptors.response.use(
    (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data
            });
        }
        return response;
    },
    (error) => {
        // Log errors in development
        if (import.meta.env.DEV) {
            console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        }

        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('supplierToken');
            localStorage.removeItem('supplierInfo');
            
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
                errorMessage = 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
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