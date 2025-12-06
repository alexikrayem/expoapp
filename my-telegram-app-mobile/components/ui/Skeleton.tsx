import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
    colorMode?: 'light' | 'dark';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
    colorMode = 'light',
}) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const backgroundColor = colorMode === 'light' ? '#E1E9EE' : '#333';

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor,
                } as ViewStyle,
                animatedStyle,
                style,
            ]}
        />
    );
};
