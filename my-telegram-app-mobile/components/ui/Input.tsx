import React from 'react';
import { TextInput, View, TextInputProps, StyleSheet } from 'react-native';
import Text from '@/components/ThemedText';


interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const Input = ({
    label,
    error,
    containerClassName = '',
    className = '',
    style,
    ...props
}: InputProps) => {
    return (
        <View className={`w-full ${containerClassName}`}>
            {label && (
                <Text className="mb-1.5 text-sm font-medium text-text-main">
                    {label}
                </Text>
            )}
            <TextInput
                className={`w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base text-text-main placeholder:text-text-secondary focus:border-primary-500 focus:bg-white ${error ? 'border-error' : ''
                    } ${className}`}
                placeholderTextColor="#94a3b8"
                style={[styles.input, style]}
                {...props}
            />
            {error && (
                <Text className="mt-1 text-sm text-error">
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    input: {
        fontFamily: 'TajawalCustom',
    },
});
