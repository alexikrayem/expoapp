import {
    getAccessToken,
    tokenRefreshManager,
} from "../utils/tokenManager"
import { API_CONFIG } from "../utils/constants"
import { logger } from "../utils/logger"

const API_BASE_URL = API_CONFIG.BASE_URL
const REQUEST_TIMEOUT = API_CONFIG.TIMEOUT

// ---------------------------------------------------------------------------
// Fetch with timeout + external abort signal support
// ---------------------------------------------------------------------------

const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout: number,
): Promise<Response> => {
    const timeoutController = new AbortController()
    const requestController = new AbortController()
    let didTimeout = false

    const abortRequest = () => {
        if (!requestController.signal.aborted) {
            requestController.abort()
        }
    }

    const onTimeoutAbort = () => abortRequest()
    timeoutController.signal.addEventListener("abort", onTimeoutAbort)

    const externalSignal = options.signal
    let onExternalAbort: (() => void) | undefined
    if (externalSignal) {
        if (externalSignal.aborted) {
            abortRequest()
        } else {
            onExternalAbort = () => abortRequest()
            externalSignal.addEventListener("abort", onExternalAbort)
        }
    }

    const timeoutId = setTimeout(() => {
        didTimeout = true
        timeoutController.abort()
    }, timeout)

    try {
        const response = await fetch(url, {
            ...options,
            signal: requestController.signal,
        })
        return response
    } catch (err: any) {
        if (err?.name === "AbortError") {
            err.isTimeout = didTimeout
        }
        throw err
    } finally {
        clearTimeout(timeoutId)
        timeoutController.signal.removeEventListener("abort", onTimeoutAbort)
        if (externalSignal && onExternalAbort) {
            externalSignal.removeEventListener("abort", onExternalAbort)
        }
    }
}

// ---------------------------------------------------------------------------
// Main API Client
// ---------------------------------------------------------------------------

export async function apiClient<T = any>(
    endpoint: string,
    { body, ...customConfig }: Omit<RequestInit, "body"> & { body?: any } = {},
): Promise<T | null> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }

    // Attach JWT access token if available
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

        // ── 401 → attempt a single token refresh via the shared manager ──
        if (response.status === 401) {
            try {
                const newAccessToken = await tokenRefreshManager.refresh()
                const requestHeaders = (config.headers || {}) as Record<string, string>
                requestHeaders["Authorization"] = `Bearer ${newAccessToken}`
                config.headers = requestHeaders
                response = await fetchWithTimeout(fullUrl, config, REQUEST_TIMEOUT)
            } catch (refreshErr) {
                throw refreshErr
            }
        }

        // ── Error handling ──
        if (!response.ok) {
            let error: any = { message: `Request failed with status ${response.status}` }
            try {
                const parsedError = await response.json()
                if (parsedError && typeof parsedError === "object") {
                    error = parsedError
                } else if (typeof parsedError === "string") {
                    error = { message: parsedError }
                }
            } catch (_) { }

            if (!error.message) {
                if (typeof error.error === "string") {
                    error.message = error.error
                } else if (Array.isArray(error.details) && error.details.length > 0) {
                    const firstDetail = error.details[0]
                    error.message = firstDetail?.message || firstDetail?.msg || `Request failed with status ${response.status}`
                } else {
                    error.message = `Request failed with status ${response.status}`
                }
            }

            error.status = response.status
            return Promise.reject(error)
        }

        // ── 204 No Content ──
        if (response.status === 204) return null

        // ── Parse response body ──
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json()
            return data as T
        }

        // Non-JSON response — log so we notice misconfigured endpoints
        const textPreview = await response.text().catch(() => "(unreadable)")
        logger.warn(`Non-JSON response from ${endpoint}:`, textPreview.slice(0, 200))
        return null
    } catch (err: any) {
        if (err.name === "AbortError" && err.isTimeout) {
            return Promise.reject({ message: "انتهت مهلة الطلب. يرجى التحقق من اتصالك بالإنترنت.", isTimeout: true })
        }
        if (err.name === "AbortError") {
            return Promise.reject(err)
        }
        logger.error("API Client Error:", err)
        return Promise.reject(err)
    }
}
