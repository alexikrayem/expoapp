// src/services/apiClient.js - Enhanced API client with better error handling
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('supplierToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for better error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('supplierToken');
            localStorage.removeItem('supplierInfo');
            window.location.href = '/login';
        }
        
        // Format error message
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           error.message || 
                           'An unexpected error occurred';
        
        return Promise.reject(new Error(errorMessage));
    }
);

export default apiClient;