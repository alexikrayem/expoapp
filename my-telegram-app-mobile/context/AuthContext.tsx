"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { authService } from "@/services/authService"
import { userService } from "@/services/userService"
import { getAccessToken, clearTokens } from "@/api/apiClient"
import { ensureValidToken } from "@/utils/tokenManager"
import { UserProfile } from "@/types"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  userProfile: UserProfile | null
  login: () => Promise<void>
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

  const fetchProfile = async () => {
    try {
      const profile = await userService.getProfile()
      setUserProfile(profile)
    } catch (error) {
      console.error("[AuthContext] Failed to fetch profile:", error)
      throw error
    }
  }

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
        } catch (error) {
          await logout()
        }
      } catch (error) {
        await logout()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async () => {
    setIsLoading(true)
    try {
      await authService.loginWithTelegram()
      setIsAuthenticated(true)
      await fetchProfile()
    } catch (error) {
      console.error("[AuthContext] Login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await clearTokens()
    setIsAuthenticated(false)
    setUserProfile(null)
  }

  const refreshAuth = async () => {
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
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, userProfile, login, logout, refreshProfile: fetchProfile, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}
