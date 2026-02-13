import Constants from "expo-constants"
import { Platform } from "react-native"

import { logger } from "@/utils/logger"

export function logDevDiagnostics() {
  if (!__DEV__) return

  const isHermes = !!(globalThis as any).HermesInternal
  const hasWindow =
    typeof globalThis !== "undefined" && (globalThis as any).window != null
  const userAgent = hasWindow
    ? (globalThis as any).window?.navigator?.userAgent
    : undefined
  const isRemoteDebuggingLikely =
    Platform.OS !== "web" &&
    hasWindow &&
    typeof userAgent === "string" &&
    userAgent.includes("Chrome")

  const appVersion =
    Constants.expoConfig?.version ??
    (Constants as any).manifest2?.version ??
    (Constants as any).manifest?.version
  const appName =
    Constants.expoConfig?.name ??
    (Constants as any).manifest2?.name ??
    (Constants as any).manifest?.name

  logger.info("[dev-diagnostics] app", {
    name: appName,
    version: appVersion,
    platform: Platform.OS,
  })
  logger.info("[dev-diagnostics] engine", { hermes: isHermes })
  logger.info("[dev-diagnostics] debug", {
    remoteDebuggingLikely: isRemoteDebuggingLikely,
    userAgent,
  })

  if (isRemoteDebuggingLikely) {
    logger.warn(
      "[dev-diagnostics] Remote JS Debugging is likely enabled. Reanimated worklets do not run in this mode. Use Hermes Inspector instead."
    )
  } else if (!isHermes && Platform.OS !== "web") {
    logger.warn(
      "[dev-diagnostics] Hermes is not detected. If you enable Remote JS Debugging, Reanimated worklets will not run."
    )
  }
}
