import React from 'react';
import { TouchableOpacity, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import Text from '@/components/ThemedText';


interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    className?: string;
    textClassName?: string;
}

export const Button = ({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    textClassName = '',
    disabled,
    ...props
}: ButtonProps) => {
    const baseStyles = 'flex-row items-center justify-center rounded-full active:opacity-80';

    const variants = {
        primary: 'bg-primary-500 shadow-sm shadow-primary-500/20',
        secondary: 'bg-primary-50',
        outline: 'bg-transparent border border-primary-200',
        ghost: 'bg-transparent',
    };

    const sizes = {
        sm: 'px-4 py-2',
        md: 'px-6 py-3.5',
        lg: 'px-8 py-4',
    };

    const textVariants = {
        primary: 'text-white font-semibold',
        secondary: 'text-primary-600 font-semibold',
        outline: 'text-primary-600 font-medium',
        ghost: 'text-primary-600 font-medium',
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    return (
        <TouchableOpacity
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : '#3b82f6'} className="mr-2" />
            ) : null}
            <Text className={`${textVariants[variant]} ${textSizes[size]} ${textClassName}`}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};
