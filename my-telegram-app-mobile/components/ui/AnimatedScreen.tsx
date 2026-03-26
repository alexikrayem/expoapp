import React from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';
import { MOTION } from '@/utils/motion';

interface AnimatedScreenProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    className?: string;
    delay?: number;
}

export default function AnimatedScreen({ children, style, className, delay = 0 }: AnimatedScreenProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(MOTION.screenEnterMs)}
            exiting={FadeOut.duration(MOTION.screenExitMs)}
            style={style}
            className={`flex-1 ${className || ''}`}
        >
            {children}
        </Animated.View>
    );
}
