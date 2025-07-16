// my-telegram-app/src/api/apiClient.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEVELOPMENT = import.meta.env.DEV; // Vite provides this boolean

async function apiClient(endpoint, { body, ...customConfig } = {}) {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    const headers = { 'Content-Type': 'application/json' };

    // This is the key change:
    if (IS_DEVELOPMENT && !initData) {
        // If we're in development mode AND there's no real Telegram data,
        // send the special bypass header.
        headers['X-Dev-Bypass-Auth'] = 'true';
        console.log("DEV MODE: Sending bypass auth header.");
    } else if (initData) {
        // Otherwise, if we DO have initData (in production), send it.
        headers['X-Telegram-Init-Data'] = initData;
    }

    const config = {
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
            } catch (_) { /* Ignore if not JSON */ }
            error.status = response.status;
            return Promise.reject(error);
        }
        
        if (response.status === 204) return null;

        return await response.json();
    } catch (error) {
        console.error('API Client Error:', error);
        return Promise.reject(error);
    }
}

export { apiClient };