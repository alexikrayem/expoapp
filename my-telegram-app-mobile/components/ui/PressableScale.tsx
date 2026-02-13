import React from "react"
import { Pressable, PressableProps } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

interface PressableScaleProps extends PressableProps {
  scaleTo?: number
  duration?: number
  className?: string
  pressableClassName?: string
  style?: any
}

export default function PressableScale({
  children,
  scaleTo = 0.98,
  duration = 120,
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
        {children}
      </Animated.View>
    </Pressable>
  )
}
