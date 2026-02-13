// src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_DELIVERY_API_BASE_URL || 'http://localhost:3001';

const getAccessToken = () =>
    localStorage.getItem('deliveryAgentAccessToken') || localStorage.getItem('deliveryAgentToken');
const getRefreshToken = () => localStorage.getItem('deliveryAgentRefreshToken');

const setTokens = (accessToken, refreshToken) => {
    if (accessToken) {
        localStorage.setItem('deliveryAgentAccessToken', accessToken);
        localStorage.removeItem('deliveryAgentToken');
    }
    if (refreshToken) {
        localStorage.setItem('deliveryAgentRefreshToken', refreshToken);
    }
};

const clearTokens = () => {
    localStorage.removeItem('deliveryAgentAccessToken');
    localStorage.removeItem('deliveryAgentRefreshToken');
    localStorage.removeItem('deliveryAgentToken');
    localStorage.removeItem('deliveryAgentInfo');
};

const refreshAccessToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
            headers: {
                Authorization: `Bearer ${refreshToken}`,
            },
        }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    setTokens(accessToken, newRefreshToken);
    return accessToken;
};

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const newAccessToken = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                clearTokens();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

const logoutRequest = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    await apiClient.post('/api/auth/logout', { refreshToken });
};

export { setTokens, clearTokens, getAccessToken, getRefreshToken, logoutRequest };
export default apiClient;
