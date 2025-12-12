// my-telegram-app/src/utils/tokenManager.js

// --- Token utilities (defined here to avoid circular dependencies) ---
const getAccessToken = () => localStorage.getItem("accessToken");

const setTokens = (accessToken) => {
  localStorage.setItem("accessToken", accessToken);
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
};

// Helper to decode JWT token without verification (for expiration check)
const decodeToken = (token) => {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired or will expire soon (within 5 minutes)
const isTokenExpiringSoon = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true; // If no expiration, consider expired

  const now = Date.now() / 1000; // Current time in seconds
  const bufferTime = 5 * 60; // 5 minutes buffer in seconds

  return decoded.exp - now < bufferTime;
};

// Proactively refresh the access token if it's about to expire
const ensureValidToken = async () => {
  const accessToken = getAccessToken();

  if (accessToken && !isTokenExpiringSoon(accessToken)) {
    // Token is still valid, no need to refresh
    return accessToken;
  }

  // Token is expiring soon or missing, try to refresh it using the HttpOnly cookie
  try {
    const headers = { "Content-Type": "application/json" };
    // Include credentials to send cookies
    const fetchOptions = {
      method: "POST",
      headers,
      credentials: 'include' // IMPORTANT: This allows sending HttpOnly cookies
    };

    const IS_DEVELOPMENT = import.meta.env.DEV;

    // In development mode, we send the bypass header if needed (though cookies should work if origin matches)
    if (IS_DEVELOPMENT) {
      headers["X-Dev-Bypass-Auth"] = import.meta.env.VITE_DEV_BYPASS_SECRET;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, fetchOptions);

    if (!response.ok) {
      throw new Error(`Token refresh failed with status ${response.status}`);
    }

    const data = await response.json();
    setTokens(data.accessToken);

    console.log("Token proactively refreshed successfully");
    return data.accessToken;
  } catch (err) {
    console.error("Proactive token refresh error:", err);
    clearTokens();
    throw err;
  }
};

// Check if access token is valid without refreshing
const isAccessTokenValid = () => {
  const accessToken = getAccessToken();
  if (!accessToken) return false;

  return !isTokenExpiringSoon(accessToken);
};

// Get a valid access token, automatically refreshing if needed
const getValidAccessToken = async () => {
  try {
    return await ensureValidToken();
  } catch (error) {
    console.error("Failed to get valid access token:", error);
    return null;
  }
};

export {
  ensureValidToken,
  isAccessTokenValid,
  getValidAccessToken,
  decodeToken,
  isTokenExpiringSoon,
  getAccessToken,
  setTokens,
  clearTokens
};