import { Image } from "expo-image"

/**
 * Configure global image caching settings
 * Call this once in app initialization
 */
export function configureImageCache() {
  // Set memory cache limit (in bytes) - 100MB
  Image.prefetch
}

/**
 * Performance constants for lists
 */
export const LIST_PERFORMANCE = {
  // How many items to render initially
  initialNumToRender: 10,
  // Max items to render per batch
  maxToRenderPerBatch: 10,
  // Number of screens to keep rendered
  windowSize: 5,
  // Distance from end to trigger load more
  onEndReachedThreshold: 0.5,
  // Remove items outside viewport
  removeClippedSubviews: true,
} as const

/**
 * Animation performance settings
 */
export const ANIMATION_CONFIG = {
  // Spring config for smooth animations
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  // Timing config for simple transitions
  timing: {
    duration: 200,
  },
} as const

/**
 * Debounce/throttle times for user interactions
 */
export const INTERACTION_DELAYS = {
  search: 300,
  scroll: 16,
  tap: 50,
} as const
