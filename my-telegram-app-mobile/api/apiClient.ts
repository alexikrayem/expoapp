import { storage } from '../utils/storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const IS_DEVELOPMENT = __DEV__; // React Native global for dev mode

// --- Token utilities ---
export const getAccessToken = async () => await storage.getItem("accessToken");
export const getRefreshToken = async () => await storage.getItem("refreshToken");

export const setTokens = async (accessToken: string, refreshToken: string) => {
    await storage.setItem("accessToken", accessToken);
    await storage.setItem("refreshToken", refreshToken);
};

export const clearTokens = async () => {
    await storage.removeItem("accessToken");
    await storage.removeItem("refreshToken");
};

// --- Refresh Access Token ---
const refreshAccessToken = async () => {
    try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token available");

        const headers: Record<string, string> = { "Content-Type": "application/json" };

        // In development mode, we send the bypass header
        if (IS_DEVELOPMENT && process.env.EXPO_PUBLIC_DEV_BYPASS_SECRET) {

            console.log("DEV MODE: Using bypass header for refresh token request.");
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers,
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) throw new Error("Token refresh failed");

        const data = await response.json();
        const newRefreshToken = data.refreshToken || refreshToken;
        await setTokens(data.accessToken, newRefreshToken);
        return data.accessToken;
    } catch (err) {
        console.error("Token refresh error:", err);
        await clearTokens();
        throw err;
    }
};

// --- Main API Client ---
export async function apiClient(endpoint: string, { body, ...customConfig }: Omit<RequestInit, 'body'> & { body?: any } = {}) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // In development mode, we send the bypass header
    if (IS_DEVELOPMENT && process.env.EXPO_PUBLIC_DEV_BYPASS_SECRET) {

    }

    // Add JWT access token if exists
    const accessToken = await getAccessToken();
    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const config: RequestInit = {
        method: body ? "POST" : "GET",
        ...customConfig,
        headers: {
            ...headers,
            ...customConfig.headers,
        },
    };

    if (body) config.body = JSON.stringify(body);

    const fullUrl = `${API_BASE_URL}/${endpoint}`;

    try {
        let response = await fetch(fullUrl, config);

        // Attempt token refresh on 401
        if (response.status === 401) {
            const refreshToken = await getRefreshToken();
            if (refreshToken) {
                try {
                    const newAccessToken = await refreshAccessToken();
                    // @ts-ignore
                    config.headers["Authorization"] = `Bearer ${newAccessToken}`;
                    response = await fetch(fullUrl, config);
                } catch (refreshErr) {
                    throw refreshErr;
                }
            } else {
                if (IS_DEVELOPMENT) {
                    console.warn("DEV MODE: 401 received and no refresh token found. Bypass might be failing.");
                }
            }
        }

        if (!response.ok) {
            let error: any = { message: `Request failed with status ${response.status}` };
            try {
                error = await response.json();
            } catch (_) { }
            error.status = response.status;
            return Promise.reject(error);
        }

        if (response.status === 204) return null;

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();

            // Save tokens if the response includes them
            if (data.accessToken && data.refreshToken) {
                await setTokens(data.accessToken, data.refreshToken);
            }

            return data;
        }

        return null;
    } catch (err) {
        console.error("API Client Error:", err);
        return Promise.reject(err);
    }
}
