// src/services/api.js
import axios from 'axios';

const getDeliveryAuthToken = () => localStorage.getItem('deliveryAgentToken');

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_DELIVERY_API_BASE_URL || 'http://localhost:3001',
});

apiClient.interceptors.request.use(
    (config) => {
        const token = getDeliveryAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// You can add specific API call functions here later, e.g.:
// export const loginDeliveryAgent = (credentials) => apiClient.post('/api/auth/delivery/login', credentials);
// export const fetchAssignedItems = (page = 1) => apiClient.get(`/api/delivery/assigned-items?page=${page}`);
// etc.

export default apiClient;