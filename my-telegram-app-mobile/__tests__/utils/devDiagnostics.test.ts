import { Platform } from "react-native"

import { logDevDiagnostics } from "@/utils/devDiagnostics"
import { logger } from "@/utils/logger"

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      name: "TestApp",
      version: "0.1.0",
    },
  },
}))

jest.mock("@/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
}))

function setDevFlag(value: boolean) {
  try {
    Object.defineProperty(global, "__DEV__", {
      value,
      writable: true,
      configurable: true,
    })
  } catch {
    ;(global as any).__DEV__ = value
  }
}

describe("devDiagnostics", () => {
  const originalWindow = (globalThis as any).window
  const originalHermes = (globalThis as any).HermesInternal

  beforeEach(() => {
    jest.clearAllMocks()
    Platform.OS = "ios"
    setDevFlag(true)
    ;(globalThis as any).window = undefined
    ;(globalThis as any).HermesInternal = {}
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
    ;(globalThis as any).HermesInternal = originalHermes
  })

  it("logs baseline diagnostics in dev mode", () => {
    logDevDiagnostics()

    expect(logger.info).toHaveBeenCalledWith("[dev-diagnostics] app", {
      name: "TestApp",
      version: "0.1.0",
      platform: "ios",
    })
    expect(logger.info).toHaveBeenCalledWith("[dev-diagnostics] engine", {
      hermes: true,
    })
    expect(logger.info).toHaveBeenCalledWith("[dev-diagnostics] debug", {
      remoteDebuggingLikely: false,
      userAgent: undefined,
    })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("warns when remote debugging is likely enabled", () => {
    ;(globalThis as any).HermesInternal = undefined
    ;(globalThis as any).window = {
      navigator: { userAgent: "Chrome/123" },
    }

    logDevDiagnostics()

    expect(logger.warn).toHaveBeenCalledWith(
      "[dev-diagnostics] Remote JS Debugging is likely enabled. Reanimated worklets do not run in this mode. Use Hermes Inspector instead."
    )
  })

  it("warns when Hermes is not detected and remote debugging is not likely", () => {
    ;(globalThis as any).HermesInternal = undefined
    ;(globalThis as any).window = {
      navigator: { userAgent: "Safari" },
    }

    logDevDiagnostics()

    expect(logger.warn).toHaveBeenCalledWith(
      "[dev-diagnostics] Hermes is not detected. If you enable Remote JS Debugging, Reanimated worklets will not run."
    )
  })

  it("does nothing when not in dev mode", () => {
    setDevFlag(false)

    logDevDiagnostics()

    expect(logger.info).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
