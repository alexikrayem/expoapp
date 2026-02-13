import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

import { resolveFontStyle } from '@/utils/fonts';

export default function Text({ style, ...props }: TextProps) {
    const resolvedFont = resolveFontStyle(style);
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
