import type React from "react"
import { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react"
import { userService } from "@/services/userService"
import { getAccessToken, ensureValidToken } from "@/utils/tokenManager"
import { authService } from "@/services/authService"
import { UserProfile } from "@/types"
import { logger } from "@/utils/logger"

interface AuthContextType {
  isAuthenticated: boolean
  /** True once the auth check is complete and the user is **not** logged in. */
  isGuest: boolean
  isLoading: boolean
  userProfile: UserProfile | null
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await userService.getProfile()
      setUserProfile(profile)
    } catch (error) {
      logger.error("[AuthContext] Failed to fetch profile:", error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setIsAuthenticated(false)
    setUserProfile(null)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentToken = await getAccessToken()

        if (!currentToken) {
          setIsAuthenticated(false)
          setIsLoading(false)
          return
        }

        try {
          await ensureValidToken()
          await fetchProfile()
          setIsAuthenticated(true)
        } catch {
          await logout()
        }
      } catch {
        await logout()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await ensureValidToken()
      if (token) {
        setIsAuthenticated(true)
        await fetchProfile()
      }
    } catch (error) {
      logger.error("[AuthContext] refreshAuth failed:", error)
      await logout()
    } finally {
      setIsLoading(false)
    }
  }, [fetchProfile, logout])

  // isGuest is only true after loading finishes and the user is not authenticated.
  // This prevents components from briefly treating an initialising session as a guest.
  const isGuest = !isAuthenticated && !isLoading

  const value = useMemo(
    () => ({ isAuthenticated, isGuest, isLoading, userProfile, logout, refreshProfile: fetchProfile, refreshAuth }),
    [isAuthenticated, isGuest, isLoading, userProfile, logout, fetchProfile, refreshAuth],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
