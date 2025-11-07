// my-telegram-app/src/api/apiClient.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEVELOPMENT = import.meta.env.DEV; // Vite provides this boolean

// Token storage functions
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
};
const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};

// Token refresh function
const refreshAccessToken = async () => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
    } catch (error) {
        console.error('Token refresh error:', error);
        clearTokens();
        // Optionally redirect to login page
        // window.location.href = '/login';
        throw error;
    }
};

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

    // Add access token if available
    const accessToken = getAccessToken();
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
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
        let response = await fetch(fullUrl, config);

        // If the response is 401 (Unauthorized), try to refresh the token
        if (response.status === 401) {
            try {
                const newAccessToken = await refreshAccessToken();
                
                // Retry the original request with the new access token
                config.headers['Authorization'] = `Bearer ${newAccessToken}`;
                response = await fetch(fullUrl, config);
            } catch (refreshError) {
                // If token refresh fails, reject with the original error
                throw refreshError;
            }
        }

        if (!response.ok) {
            let error = { message: `Request failed with status ${response.status}`};
            try {
                error = await response.json();
            } catch (_) { /* Ignore if not JSON */ }
            error.status = response.status;
            return Promise.reject(error);
        }

        if (response.status === 204) return null;

        // Check if the response contains new tokens
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // If this is a login response with tokens, store them
            if (data.accessToken && data.refreshToken) {
                setTokens(data.accessToken, data.refreshToken);
                // Return the data without the tokens to avoid duplication in the consuming code
                // unless the calling code specifically needs them
            }
            
            return data;
        }

        return null;
    } catch (error) {
        console.error('API Client Error:', error);
        return Promise.reject(error);
    }
}

export { apiClient, setTokens, clearTokens, getAccessToken, getRefreshToken };