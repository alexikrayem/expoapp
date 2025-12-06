import React from 'react';
import { View, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import Text from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface AIChatOverlayProps {
    visible: boolean;
}

export default function AIChatOverlay({ visible }: AIChatOverlayProps) {
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    return (
        <Animated.View
            entering={SlideInRight.springify().damping(15)}
            exiting={SlideOutRight}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <View className="flex-1 px-4">
                <View className="items-center mt-10 mb-8">
                    <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
                        <Text className="text-3xl">🤖</Text>
                    </View>
                    <Text className="text-2xl font-bold text-text-main mb-2">مساعدك الذكي</Text>
                    <Text className="text-text-secondary text-center">
                        أنا هنا لمساعدتك في العثور على المنتجات، تتبع الطلبات، أو الإجابة على استفساراتك.
                    </Text>
                </View>

                {/* Chat History Placeholder */}
                <View className="flex-1 justify-center items-center opacity-50">
                    <Text className="text-text-secondary">ابدأ المحادثة في الأسفل...</Text>
                </View>
            </View>

            {/* Spacer for the bottom input bar */}
            <View style={{ height: 100 }} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f8fafc', // Surface color
        zIndex: 0, // Behind the tab bar
    },
});
