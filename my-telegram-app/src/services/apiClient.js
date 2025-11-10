// my-telegram-app/src/api/apiClient.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const IS_DEVELOPMENT = import.meta.env.DEV; // true in vite dev mode

// --- Token utilities ---
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// --- Refresh Access Token ---
const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token available");

    const headers = { "Content-Type": "application/json" };

    // In development mode, we send the bypass header
    if (IS_DEVELOPMENT) {
      headers["X-Dev-Bypass-Auth"] = import.meta.env.VITE_DEV_BYPASS_SECRET;
      console.log("DEV MODE: Using bypass header for refresh token request.");
    }

    // ✅ Always hit your actual backend route, adjust prefix if needed
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error("Token refresh failed");

    const data = await response.json();
    const newRefreshToken = data.refreshToken || refreshToken;
    setTokens(data.accessToken, newRefreshToken);
    return data.accessToken;
  } catch (err) {
    console.error("Token refresh error:", err);
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
    console.log("DEV MODE: Sending X-Dev-Bypass-Auth header.");
  }

  // Add JWT access token if exists
  const accessToken = getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const config = {
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
      } catch (_) {}
      error.status = response.status;
      return Promise.reject(error);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();

      // Save tokens if the response includes them
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken);
      }

      return data;
    }

    return null;
  } catch (err) {
    console.error("API Client Error:", err);
    return Promise.reject(err);
  }
}

export { apiClient, setTokens, clearTokens, getAccessToken, getRefreshToken };
