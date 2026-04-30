import { storage } from "./storage"
import { API_CONFIG } from "./constants"
import { logger } from "./logger"

const API_BASE_URL = API_CONFIG.BASE_URL
const REQUEST_TIMEOUT = API_CONFIG.TIMEOUT

// ---------------------------------------------------------------------------
// Token read/write helpers (single source of truth)
// ---------------------------------------------------------------------------

export const getAccessToken = async (): Promise<string | null> =>
    storage.getItem("accessToken")

export const getRefreshToken = async (): Promise<string | null> =>
    storage.getItem("refreshToken")

export const setTokens = async (
    accessToken: string,
    refreshToken: string,
): Promise<void> => {
    await storage.setItem("accessToken", accessToken)
    await storage.setItem("refreshToken", refreshToken)
}

export const clearTokens = async (): Promise<void> => {
    await storage.removeItem("accessToken")
    await storage.removeItem("refreshToken")
}

// ---------------------------------------------------------------------------
// JWT helpers (decode without verification — for expiration checks only)
// ---------------------------------------------------------------------------

export const decodeToken = (token: string | null): Record<string, unknown> | null => {
    if (!token) return null

    try {
        const base64Url = token.split(".")[1]
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join(""),
        )
        return JSON.parse(jsonPayload)
    } catch (error) {
        logger.error("Error decoding token:", error)
        return null
    }
}

/** Returns `true` when the token is missing, invalid, or will expire within 5 minutes. */
export const isTokenExpiringSoon = (token: string | null): boolean => {
    const decoded = decodeToken(token)
    if (!decoded || !decoded['exp']) return true

    const now = Date.now() / 1000
    const bufferTime = 5 * 60 // 5 minutes

    return (decoded['exp'] as number) - now < bufferTime
}

// ---------------------------------------------------------------------------
// Singleton Token Refresh Manager
//
// Guarantees that at most ONE refresh request is in-flight at any given time.
// Concurrent callers receive the same promise. On failure the tokens are
// cleared so the auth layer can redirect to login.
// ---------------------------------------------------------------------------

const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout: number,
): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}

class TokenRefreshManager {
    private refreshPromise: Promise<string> | null = null

    /**
     * Refresh the access token using the stored refresh token.
     * If a refresh is already in-flight, the same promise is returned.
     */
    async refresh(): Promise<string> {
        if (this.refreshPromise) return this.refreshPromise

        this.refreshPromise = this.executeRefresh().finally(() => {
            this.refreshPromise = null
        })

        return this.refreshPromise
    }

    private async executeRefresh(): Promise<string> {
        const refreshToken = await getRefreshToken()
        if (!refreshToken) {
            await clearTokens()
            throw new Error("No refresh token available")
        }

        try {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                },
                REQUEST_TIMEOUT,
            )

            if (!response.ok) {
                throw new Error(`Token refresh failed with status ${response.status}`)
            }

            const data = await response.json()
            const newRefreshToken = data.refreshToken || refreshToken
            await setTokens(data.accessToken, newRefreshToken)

            return data.accessToken
        } catch (err) {
            logger.error("Token refresh error:", err)
            await clearTokens()
            throw err
        }
    }
}

/** Singleton instance — import this, never construct a new one. */
export const tokenRefreshManager = new TokenRefreshManager()

// ---------------------------------------------------------------------------
// Convenience helpers (used by AuthContext)
// ---------------------------------------------------------------------------

/**
 * Returns a valid access token, proactively refreshing if it's about to expire.
 * Throws if refresh fails.
 */
export const ensureValidToken = async (): Promise<string> => {
    const accessToken = await getAccessToken()

    if (accessToken && !isTokenExpiringSoon(accessToken)) {
        return accessToken
    }

    return tokenRefreshManager.refresh()
}

/** Check if the current access token is valid without triggering a refresh. */
export const isAccessTokenValid = async (): Promise<boolean> => {
    const accessToken = await getAccessToken()
    if (!accessToken) return false
    return !isTokenExpiringSoon(accessToken)
}

/** Get a valid token, returning `null` instead of throwing on failure. */
export const getValidAccessToken = async (): Promise<string | null> => {
    try {
        return await ensureValidToken()
    } catch (error) {
        logger.error("Failed to get valid access token:", error)
        return null
    }
}
