import { ensureValidToken } from "../utils/tokenManager"
import { setTokens } from "../api/apiClient"
import { apiClient } from "../api/apiClient"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

const getServerBaseUrl = () => {
  const apiUrl = API_BASE_URL || ""
  // Remove /api suffix to get the base server URL
  return apiUrl.replace(/\/api\/?$/, "")
}

export const authService = {
  // Telegram Login Widget authentication
  telegramLoginWidget: async (authData: any) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }

    console.log("[v0] Calling telegram-login-widget endpoint...")
    const response = await fetch(`${API_BASE_URL}/auth/telegram-login-widget`, {
      method: "POST",
      headers,
      body: JSON.stringify({ authData }),
    })

    if (!response.ok) {
      let error: any = { message: `Request failed with status ${response.status}` }
      try {
        error = await response.json()
      } catch (_) {}
      error.status = response.status
      console.log("[v0] Login error:", error)
      throw error
    }

    const data = await response.json()
    console.log("[v0] Login successful, tokens received:", !!data.accessToken, !!data.refreshToken)

    if (data.accessToken && data.refreshToken) {
      await setTokens(data.accessToken, data.refreshToken)
    }

    return data
  },

  // Production: Open hosted Telegram Widget in WebBrowser
  loginWithTelegram: async () => {
    try {
      const serverBaseUrl = getServerBaseUrl()
      const widgetUrl = `${serverBaseUrl}/telegram-widget.html`
      const redirectUrl = Linking.createURL("auth") // mytelegramappmobile://auth

      console.log("[v0] Opening auth session:", widgetUrl)
      console.log("[v0] Expected redirect:", redirectUrl)

      const result = await WebBrowser.openAuthSessionAsync(widgetUrl, redirectUrl)

      if (result.type === "success" && result.url) {
        // Parse the URL to get the user data
        const { queryParams } = Linking.parse(result.url)
        if (queryParams?.user) {
          const userString = decodeURIComponent(queryParams.user as string)
          const userData = JSON.parse(userString)

          // Now authenticate with our backend using the Telegram data
          return await authService.telegramLoginWidget(userData)
        }
      }
      return null
    } catch (error) {
      console.error("[AuthService] WebBrowser login failed:", error)
      throw error
    }
  },

  // Check if user is authenticated (has valid tokens)
  isAuthenticated: async () => {
    try {
      // Much cleaner!
      const token = await ensureValidToken()
      return !!token
    } catch (error) {
      return false
    }
  },

  // Get current user profile (using JWT tokens)
  getProfile: () => {
    // This will use the stored JWT tokens
    return apiClient("user/profile")
  },
}
