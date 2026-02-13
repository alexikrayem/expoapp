import React from "react"
import { TextInput, View, TextInputProps, StyleSheet, I18nManager } from "react-native"

import Text from "@/components/ThemedText"
import { resolveFontStyle } from "@/utils/fonts"

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerClassName?: string
  fieldClassName?: string
  className?: string
  labelClassName?: string
  errorClassName?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  containerClassName = "",
  fieldClassName = "",
  className = "",
  labelClassName,
  errorClassName,
  style,
  leftIcon,
  rightIcon,
  ...props
}, ref) => {
  const resolvedFont = resolveFontStyle(style)
  const inputStyle = resolvedFont ? [styles.input, style, resolvedFont] : [styles.input, style]
  const isRTL = I18nManager.isRTL
  const labelAlignClass = labelClassName ?? (isRTL ? "text-right" : "text-left")
  const errorAlignClass = errorClassName ?? (isRTL ? "text-right" : "text-left")

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && <Text className={`mb-1.5 text-sm font-medium text-text-main ${labelAlignClass}`}>{label}</Text>}

      <View
        className={`flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3.5 ${
          error ? "border-error" : ""
        } ${fieldClassName}`}
      >
        {leftIcon ? <View className="mr-3">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          className={`flex-1 text-base text-text-main placeholder:text-text-secondary ${className}`}
          placeholderTextColor="#94a3b8"
          style={inputStyle}
          {...props}
        />
        {rightIcon ? <View className="ml-3">{rightIcon}</View> : null}
      </View>

      {error && <Text className={`mt-1 text-sm text-error ${errorAlignClass}`}>{error}</Text>}
    </View>
  )
})

Input.displayName = "Input"

const styles = StyleSheet.create({
  input: {
    fontFamily: "TajawalCustom",
  },
})
