import { StyleSheet, TextStyle } from "react-native"

const FONT_FAMILY = {
  regular: "TajawalCustom",
  medium: "Tajawal_500Medium",
  bold: "Tajawal_700Bold",
}

const WEIGHT_TO_FAMILY: Record<string, string> = {
  "100": FONT_FAMILY.regular,
  "200": FONT_FAMILY.regular,
  "300": FONT_FAMILY.regular,
  "400": FONT_FAMILY.regular,
  "500": FONT_FAMILY.medium,
  "600": FONT_FAMILY.bold,
  "700": FONT_FAMILY.bold,
  "800": FONT_FAMILY.bold,
  "900": FONT_FAMILY.bold,
  normal: FONT_FAMILY.regular,
  medium: FONT_FAMILY.medium,
  semibold: FONT_FAMILY.bold,
  bold: FONT_FAMILY.bold,
  heavy: FONT_FAMILY.bold,
  black: FONT_FAMILY.bold,
}

export function resolveFontStyle(style?: TextStyle | TextStyle[]) {
  const flat = StyleSheet.flatten(style) || {}

  if (flat.fontFamily) {
    return undefined
  }

  const weight = flat.fontWeight ? String(flat.fontWeight) : undefined
  const fontFamily = weight ? WEIGHT_TO_FAMILY[weight] || FONT_FAMILY.regular : FONT_FAMILY.regular

  if (weight) {
    return { fontFamily, fontWeight: "normal" as TextStyle["fontWeight"] }
  }

  return { fontFamily }
}
