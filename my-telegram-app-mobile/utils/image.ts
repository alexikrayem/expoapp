import { Image } from "expo-image"
import { Platform } from "react-native"

export const IMAGE_PLACEHOLDER_BLURHASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj"

const DEFAULT_PREFETCH_LIMIT = 12

export const prefetchImages = (
  urls: Array<string | null | undefined>,
  limit: number = DEFAULT_PREFETCH_LIMIT,
) => {
  if (Platform.OS === "web") return

  const unique = Array.from(
    new Set(
      urls.filter((uri): uri is string => typeof uri === "string" && uri.startsWith("http")),
    ),
  ).slice(0, limit)

  if (unique.length === 0) return

  unique.forEach((uri) => {
    Image.prefetch(uri).catch(() => {})
  })
}
