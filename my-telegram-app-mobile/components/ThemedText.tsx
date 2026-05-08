import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

import { resolveFontStyle } from '@/utils/fonts';
import type { TextStyle } from 'react-native';

export default function Text({ style, ...props }: TextProps) {
    const resolvedFont = resolveFontStyle(style as TextStyle | TextStyle[]);
    const combinedStyle = resolvedFont ? [styles.defaultFont, style, resolvedFont] : [styles.defaultFont, style];
    return (
        <RNText
            style={combinedStyle}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    defaultFont: {
        fontFamily: 'TajawalCustom',
    },
});
