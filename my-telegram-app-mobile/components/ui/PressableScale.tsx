import React from "react"
import { Pressable, PressableProps } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { haptics } from "@/utils/haptics"
import { MOTION } from "@/utils/motion"

interface PressableScaleProps extends PressableProps {
  scaleTo?: number
  duration?: number
  haptic?: "light" | "medium" | "heavy" | "selection" | false
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
  className?: string
  pressableClassName?: string
  style?: any
}

export default function PressableScale({
  children,
  scaleTo = MOTION.pressScale,
  duration = MOTION.pressDurationMs,
  haptic,
  disabled,
  onPressIn,
  onPressOut,
  className,
  pressableClassName,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      {...props}
      className={pressableClassName}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          if (haptic) {
            haptics[haptic]?.()
          }
          scale.value = withTiming(scaleTo, { duration })
        }
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        if (!disabled) {
          scale.value = withTiming(1, { duration })
        }
        onPressOut?.(event)
      }}
    >
      <Animated.View style={[animatedStyle, style]} className={className}>
        {typeof children === "function" ? children({ pressed: false }) : children}
      </Animated.View>
    </Pressable>
  )
}
