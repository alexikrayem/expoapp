// src/services/apiClient.js - Centralized API client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Grab the initData from Telegram WebApp if available
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData || '';

        // Merge headers, add X-Telegram-Init-Data if available
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    }

    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data,
            ...options,
        });
    }

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data,
            ...options,
        });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
