import { ensureValidToken } from "../utils/tokenManager"
import { apiClient, getRefreshToken, clearTokens } from "../api/apiClient"
import { logger } from "../utils/logger"
import { API_CONFIG } from "../utils/constants"

const API_BASE_URL = API_CONFIG.BASE_URL

export const authService = {
  // --- Phone Number OTP Auth ---

  sendOtp: async (phoneNumber: string) => {
    // Note: apiClient automatically appends API_BASE_URL
    // so we pass 'auth/send-otp' -> ${API_BASE_URL}/auth/send-otp
    // This assumes API_BASE_URL ends with /api. 
    // If not, we might need to adjust, but based on apiClient.ts it seems generic.
    // However, apiClient is a wrapper that does JSON stringify etc.
    // Let's use apiClient directly.
    return apiClient("auth/send-otp", {
      method: "POST",
      body: { phone_number: phoneNumber },
    })
  },

  verifyOtp: async (phoneNumber: string, code: string) => {
    const data = await apiClient("auth/verify-otp", {
      method: "POST",
      body: { phone_number: phoneNumber, code },
    })

    // If successful and tokens returned (existing user), they are auto-saved by apiClient
    return data
  },

  registerWithPhone: async (phoneNumber: string, code: string, profileData: any) => {
    const data = await apiClient("auth/register-phone", {
      method: "POST",
      body: { phone_number: phoneNumber, code, profileData },
    })
    return data
  },

  // Check if user is authenticated (has valid tokens)
  isAuthenticated: async () => {
    try {
      const token = await ensureValidToken()
      return !!token
    } catch (error) {
      return false
    }
  },

  // Get current user profile (using JWT tokens)
  getProfile: () => {
    return apiClient("user/profile")
  },

  // Logout and revoke refresh token server-side
  logout: async () => {
    try {
      const refreshToken = await getRefreshToken()
      if (!refreshToken || !API_BASE_URL) {
        await clearTokens()
        return
      }

      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (error) {
      logger.error("Logout error:", error)
    } finally {
      await clearTokens()
    }
  },
}
