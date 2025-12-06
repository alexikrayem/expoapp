import React from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';

interface AnimatedScreenProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string;
    delay?: number;
}

export default function AnimatedScreen({ children, style, className, delay = 0 }: AnimatedScreenProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(300)}
            exiting={FadeOut.duration(200)}
            style={style}
            className={`flex-1 ${className || ''}`}
        >
            {children}
        </Animated.View>
    );
}
