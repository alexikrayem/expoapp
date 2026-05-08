import Constants from "expo-constants"
import { Platform } from "react-native"

import { logger } from "@/utils/logger"

/** Minimal shape of the legacy Constants.manifest / manifest2 */
interface LegacyManifest {
  version?: string
  name?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _globalThis = globalThis as any

export function logDevDiagnostics() {
  if (!__DEV__) return

  const isHermes = !!_globalThis.HermesInternal
  const hasWindow =
    typeof globalThis !== "undefined" && _globalThis.window != null
  const userAgent = hasWindow
    ? _globalThis.window?.navigator?.userAgent
    : undefined
  const isRemoteDebuggingLikely =
    Platform.OS !== "web" &&
    hasWindow &&
    typeof userAgent === "string" &&
    userAgent.includes("Chrome")

  const constantsRecord = Constants as unknown as Record<string, LegacyManifest | undefined>
  const appVersion =
    Constants.expoConfig?.version ??
    constantsRecord["manifest2"]?.version ??
    constantsRecord["manifest"]?.version
  const appName =
    Constants.expoConfig?.name ??
    constantsRecord["manifest2"]?.name ??
    constantsRecord["manifest"]?.name

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
