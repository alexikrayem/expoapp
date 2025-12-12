import { storage } from "../utils/storage"
import { API_CONFIG } from "../utils/constants"
import { logger } from "../utils/logger"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const REQUEST_TIMEOUT = API_CONFIG.TIMEOUT

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback)
}

// --- Token utilities ---
export const getAccessToken = async () => await storage.getItem("accessToken")
export const getRefreshToken = async () => await storage.getItem("refreshToken")

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await storage.setItem("accessToken", accessToken)
  await storage.setItem("refreshToken", refreshToken)
}

export const clearTokens = async () => {
  await storage.removeItem("accessToken")
  await storage.removeItem("refreshToken")
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
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

// --- Refresh Access Token ---
const refreshAccessToken = async (): Promise<string> => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber((token) => resolve(token))
    })
  }

  isRefreshing = true

  try {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw new Error("No refresh token available")

    const headers: Record<string, string> = { "Content-Type": "application/json" }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/auth/refresh`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken }),
      },
      REQUEST_TIMEOUT,
    )

    if (!response.ok) throw new Error("Token refresh failed")

    const data = await response.json()
    const newRefreshToken = data.refreshToken || refreshToken
    await setTokens(data.accessToken, newRefreshToken)

    onRefreshed(data.accessToken)
    return data.accessToken
  } catch (err) {
    logger.error("Token refresh error:", err)
    await clearTokens()
    throw err
  } finally {
    isRefreshing = false
  }
}

// --- Main API Client ---
export async function apiClient<T = any>(
  endpoint: string,
  { body, ...customConfig }: Omit<RequestInit, "body"> & { body?: any } = {},
): Promise<T | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }

  // Add JWT access token if exists
  const accessToken = await getAccessToken()
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const config: RequestInit = {
    method: body ? "POST" : "GET",
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  }

  if (body) config.body = JSON.stringify(body)

  const fullUrl = `${API_BASE_URL}/${endpoint}`

  try {
    let response = await fetchWithTimeout(fullUrl, config, REQUEST_TIMEOUT)

    // Attempt token refresh on 401
    if (response.status === 401) {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken()
          // @ts-ignore
          config.headers["Authorization"] = `Bearer ${newAccessToken}`
          response = await fetchWithTimeout(fullUrl, config, REQUEST_TIMEOUT)
        } catch (refreshErr) {
          throw refreshErr
        }
      }
    }

    if (!response.ok) {
      let error: any = { message: `Request failed with status ${response.status}` }
      try {
        error = await response.json()
      } catch (_) { }
      error.status = response.status
      return Promise.reject(error)
    }

    if (response.status === 204) return null

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()

      // Save tokens if the response includes them
      if (data.accessToken && data.refreshToken) {
        await setTokens(data.accessToken, data.refreshToken)
      }

      return data as T
    }

    return null
  } catch (err: any) {
    if (err.name === "AbortError") {
      return Promise.reject({ message: "انتهت مهلة الطلب. يرجى التحقق من اتصالك بالإنترنت.", isTimeout: true })
    }
    logger.error("API Client Error:", err)
    return Promise.reject(err)
  }
}
