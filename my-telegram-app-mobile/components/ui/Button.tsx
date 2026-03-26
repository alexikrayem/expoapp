import React from "react"
import { ActivityIndicator, View, PressableProps } from "react-native"

import Text from "@/components/ThemedText"
import PressableScale from "@/components/ui/PressableScale"
import { MOTION } from "@/utils/motion"

interface ButtonProps extends Omit<PressableProps, "children"> {
  title: string
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  className?: string
  textClassName?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  textClassName = "",
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading
  const baseStyles = "flex-row items-center justify-center rounded-2xl border border-transparent"

  const variants = {
    primary: "bg-primary-600 shadow-sm shadow-primary-500/20",
    secondary: "bg-primary-50",
    outline: "bg-transparent border border-primary-200",
    ghost: "bg-transparent",
  }

  const sizes = {
    sm: "h-10 px-4",
    md: "h-12 px-5",
    lg: "h-14 px-6",
  }

  const textVariants = {
    primary: "text-white font-bold",
    secondary: "text-primary-700 font-semibold",
    outline: "text-primary-600 font-semibold",
    ghost: "text-primary-600 font-semibold",
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <PressableScale
      accessibilityRole="button"
      scaleTo={isDisabled ? 1 : MOTION.pressScale}
      haptic={isDisabled ? false : "selection"}
      disabled={isDisabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isDisabled ? "opacity-60" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#2563eb"} className="mr-2" />
      ) : leftIcon ? (
        <View className="mr-2">{leftIcon}</View>
      ) : null}
      <Text className={`${textVariants[variant]} ${textSizes[size]} ${textClassName}`}>{title}</Text>
      {!loading && rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
    </PressableScale>
  )
}
