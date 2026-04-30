"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react"
import { userService } from "@/services/userService"
import { getAccessToken, ensureValidToken } from "@/utils/tokenManager"
import { authService } from "@/services/authService"
import { UserProfile } from "@/types"

interface AuthContextType {
  isAuthenticated: boolean
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
      console.error("[AuthContext] Failed to fetch profile:", error)
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
        } catch (_error) {
          await logout()
        }
      } catch (_error) {
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
      const token = await getAccessToken()
      if (token) {
        setIsAuthenticated(true)
        await fetchProfile()
      }
    } catch (error) {
      console.error("[AuthContext] refreshAuth failed:", error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchProfile])

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, userProfile, logout, refreshProfile: fetchProfile, refreshAuth }),
    [isAuthenticated, isLoading, userProfile, logout, fetchProfile, refreshAuth],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
