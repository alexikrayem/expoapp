// my-telegram-app/src/api/apiClient.js
import { ensureValidToken } from '../utils/tokenManager';
import { logger } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEVELOPMENT = import.meta.env.DEV; // true in vite dev mode

// --- Token utilities ---
const getAccessToken = () => localStorage.getItem("accessToken");

const setTokens = (accessToken) => {
  localStorage.setItem("accessToken", accessToken);
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
};

// --- Refresh Access Token ---
const refreshAccessToken = async () => {
  try {
    const headers = { "Content-Type": "application/json" };

    // In development mode, we send the bypass header
    if (IS_DEVELOPMENT) {
      headers["X-Dev-Bypass-Auth"] = import.meta.env.VITE_DEV_BYPASS_SECRET;
    }

    // ✅ Hit backend refresh route with cookies
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers,
      credentials: 'include', // IMPORTANT: Send HttpOnly cookies
    });

    if (!response.ok) throw new Error("Token refresh failed");

    const data = await response.json();
    setTokens(data.accessToken);
    return data.accessToken;
  } catch (err) {
    logger.error("Token refresh error:", err);
    clearTokens();
    throw err;
  }
};

// --- Main API Client ---
async function apiClient(endpoint, { body, ...customConfig } = {}) {
  const headers = { "Content-Type": "application/json" };

  // In development mode, we send the bypass header
  if (IS_DEVELOPMENT) {
    headers["X-Dev-Bypass-Auth"] = import.meta.env.VITE_DEV_BYPASS_SECRET;
    logger.log("DEV MODE: Sending X-Dev-Bypass-Auth header.");
  }

  // Proactively refresh token if needed before making the request
  // This will refresh the token before it expires, preventing 403 errors
  try {
    const validToken = await ensureValidToken();
    if (validToken) {
      headers["Authorization"] = `Bearer ${validToken}`;
    }
  } catch (err) {
    logger.error("Error ensuring valid token:", err);
    // If proactive refresh fails, we'll still try the request with existing token
    // and handle 401 errors as before
    const accessToken = getAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  const config = {
    method: body ? "POST" : "GET",
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    credentials: 'include', // Send cookies with every request
  };

  if (body) config.body = JSON.stringify(body);

  const fullUrl = `${API_BASE_URL}/api/${endpoint}`;

  try {
    let response = await fetch(fullUrl, config);

    // Attempt token refresh on 401
    if (response.status === 401) {
      try {
        const newAccessToken = await refreshAccessToken();
        config.headers["Authorization"] = `Bearer ${newAccessToken}`;
        response = await fetch(fullUrl, config);
      } catch (refreshErr) {
        throw refreshErr;
      }
    }

    if (!response.ok) {
      let error = { message: `Request failed with status ${response.status}` };
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
      if (data.accessToken) {
        setTokens(data.accessToken);
      }

      return data;
    }

    return null
  } catch (err) {
    logger.error("API Client Error:", err);
    return Promise.reject(err);
  }
}

export { apiClient, setTokens, clearTokens, getAccessToken };
