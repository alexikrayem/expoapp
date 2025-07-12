// src/api/apiClient.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function apiClient(endpoint, { body, ...customConfig } = {}) {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    const headers = { 'Content-Type': 'application/json' };

    if (initData) {
        headers['X-Telegram-Init-Data'] = initData;
    }

    const config = {
        // Set a default method, which can be overridden by customConfig
        method: body ? 'POST' : 'GET', 
        ...customConfig,
        headers: {
            ...headers,
            ...customConfig.headers,
        },
    };
    
    if (body) {
        config.body = JSON.stringify(body);
    }

    const fullUrl = `${API_BASE_URL}/${endpoint}`;

    try {
        const response = await fetch(fullUrl, config);

        if (!response.ok) {
            let error = { message: `Request failed with status ${response.status}`};
            try {
                error = await response.json();
            } catch (_) {
                // Ignore if the response is not JSON
            }
            error.status = response.status;
            return Promise.reject(error);
        }
        
        if (response.status === 204) {
            return null; // Handle No Content responses
        }

        return await response.json();
    } catch (error) {
        console.error('API Client Error:', error);
        return Promise.reject(error);
    }
}

export { apiClient };