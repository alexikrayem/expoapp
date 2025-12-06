import React, { useEffect, useRef } from 'react';
import { View, Animated, TouchableOpacity } from 'react-native';
import Text from '@/components/ThemedText';
import { CheckCircle, XCircle, Info, X } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    onHide: () => void;
    duration?: number;
}

export default function Toast({
    visible,
    message,
    type = 'info',
    onHide,
    duration = 3000
}: ToastProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 15
                })
            ]).start();

            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            hideToast();
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (visible) onHide();
        });
    };

    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} color="#10B981" />;
            case 'error': return <XCircle size={20} color="#EF4444" />;
            default: return <Info size={20} color="#3B82F6" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'error': return 'bg-red-50 border-red-200';
            default: return 'bg-blue-50 border-blue-200';
        }
    };

    const getTextStyles = () => {
        switch (type) {
            case 'success': return 'text-green-800';
            case 'error': return 'text-red-800';
            default: return 'text-blue-800';
        }
    };

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY }],
                position: 'absolute',
                top: 60, // Adjust based on safe area or header height
                left: 20,
                right: 20,
                zIndex: 9999,
            }}
        >
            <View className={`flex-row items-center p-4 rounded-xl border shadow-sm ${getStyles()}`}>
                <View className="mr-3">
                    {getIcon()}
                </View>
                <Text className={`flex-1 font-medium text-right ${getTextStyles()}`}>
                    {message}
                </Text>
                <TouchableOpacity onPress={hideToast} className="ml-3">
                    <X size={16} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}
