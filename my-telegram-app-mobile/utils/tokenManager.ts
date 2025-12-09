import { decode } from 'base-64';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api/apiClient';

// Helper to decode JWT token without verification (for expiration check)
export const decodeToken = (token: string | null) => {
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            decode(base64)
                .split('')
                .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Check if token is expired or will expire soon (within 5 minutes)
export const isTokenExpiringSoon = (token: string | null) => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true; // If no expiration, consider expired

    const now = Date.now() / 1000; // Current time in seconds
    const bufferTime = 5 * 60; // 5 minutes buffer in seconds

    return decoded.exp - now < bufferTime;
};

// Proactively refresh the access token if it's about to expire
export const ensureValidToken = async () => {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
        throw new Error("No refresh token available");
    }

    if (accessToken && !isTokenExpiringSoon(accessToken)) {
        // Token is still valid, no need to refresh
        return accessToken;
    }

    // Token is expiring soon, refresh it
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
       

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers,
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed with status ${response.status}`);
        }

        const data = await response.json();
        // Only update refresh token if the backend sends a new one
        const newRefreshToken = data.refreshToken || refreshToken;
        await setTokens(data.accessToken, newRefreshToken);

        console.log("Token proactively refreshed successfully");
        return data.accessToken;
    } catch (err) {
        console.error("Proactive token refresh error:", err);
        await clearTokens();
        throw err;
    }
};

// Check if access token is valid without refreshing
export const isAccessTokenValid = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    return !isTokenExpiringSoon(accessToken);
};

// Get a valid access token, automatically refreshing if needed
export const getValidAccessToken = async () => {
    try {
        return await ensureValidToken();
    } catch (error) {
        console.error("Failed to get valid access token:", error);
        return null;
    }
};
