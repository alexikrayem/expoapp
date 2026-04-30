import React from "react"
import { Text, View } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import { AuthProvider, useAuth } from "../../context/AuthContext"
import { userService } from "../../services/userService"
import { getAccessToken, clearTokens, ensureValidToken } from "../../utils/tokenManager"

jest.mock("../../services/userService", () => ({
  userService: {
    getProfile: jest.fn(),
  },
}))

jest.mock("../../utils/tokenManager", () => ({
  getAccessToken: jest.fn(),
  clearTokens: jest.fn(),
  ensureValidToken: jest.fn(),
}))

const AuthConsumer = () => {
  const { isAuthenticated, isLoading, userProfile } = useAuth()
  return (
    <View>
      <Text testID="isAuthenticated">{String(isAuthenticated)}</Text>
      <Text testID="isLoading">{String(isLoading)}</Text>
      <Text testID="userProfile">{userProfile ? "set" : "null"}</Text>
    </View>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("treats missing token as unauthenticated", async () => {
    ;(getAccessToken as jest.Mock).mockResolvedValue(null)

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("isLoading").props.children).toBe("false")
    })

    expect(getByTestId("isAuthenticated").props.children).toBe("false")
    expect(getByTestId("userProfile").props.children).toBe("null")
    expect(clearTokens).not.toHaveBeenCalled()
  })

  it("authenticates when token is valid and profile loads", async () => {
    ;(getAccessToken as jest.Mock).mockResolvedValue("token")
    ;(ensureValidToken as jest.Mock).mockResolvedValue("token")
    ;(userService.getProfile as jest.Mock).mockResolvedValue({
      id: 1,
      first_name: "Jane",
    })

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("isLoading").props.children).toBe("false")
    })

    expect(getByTestId("isAuthenticated").props.children).toBe("true")
    expect(getByTestId("userProfile").props.children).toBe("set")
    expect(userService.getProfile).toHaveBeenCalled()
  })

  it("clears auth when token validation fails", async () => {
    ;(getAccessToken as jest.Mock).mockResolvedValue("token")
    ;(ensureValidToken as jest.Mock).mockRejectedValue(new Error("invalid"))

    const { getByTestId } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("isLoading").props.children).toBe("false")
    })

    expect(clearTokens).toHaveBeenCalled()
    expect(getByTestId("isAuthenticated").props.children).toBe("false")
  })
})
