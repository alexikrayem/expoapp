import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions, TextInput, Keyboard, Platform, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { Home, Heart, ShoppingBag, Sparkles, X, Send } from 'lucide-react-native';
import Text from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const PADDING_BOTTOM = 20;
const TAB_ITEM_WIDTH = (width - 100) / 3; // Approximate width for 3 tabs

import { useAIChat } from '@/context/AIChatContext';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { isAIMode, toggleAIMode, animation } = useAIChat();
    const [inputText, setInputText] = useState('');

    // Animated Styles
    const tabBarStyle = useAnimatedStyle(() => {
        const widthValue = interpolate(
            animation.value,
            [0, 1],
            [width - 100, 60], // Shrink from full width to circle size
            Extrapolate.CLAMP
        );

        const translateX = interpolate(
            animation.value,
            [0, 1],
            [0, -((width / 2) - 50)], // Move to left corner
            Extrapolate.CLAMP
        );

        return {
            width: widthValue,
            transform: [{ translateX }],
            opacity: interpolate(animation.value, [0, 0.8, 1], [1, 0, 0]), // Fade out content
        };
    });

    const aiButtonStyle = useAnimatedStyle(() => {
        const widthValue = interpolate(
            animation.value,
            [0, 1],
            [60, width - 100], // Expand from circle to full width
            Extrapolate.CLAMP
        );

        const translateX = interpolate(
            animation.value,
            [0, 1],
            [0, -((width / 2) - 50)], // Move to center/left
            Extrapolate.CLAMP
        );

        // When expanded (AI Mode), it moves to take the place of the tab bar
        const rightPosition = interpolate(
            animation.value,
            [0, 1],
            [20, 80], // Adjust position
            Extrapolate.CLAMP
        );

        return {
            width: widthValue,
            right: 20, // Fixed right position initially
            transform: [
                // We need to handle position carefully. 
                // Easier approach: 
                // Normal: Right side
                // AI Mode: Takes up most of the screen width
            ],
        };
    });

    // Let's try a simpler layout approach with two distinct animated containers

    // Container 1: Navigation Tabs (Left/Center in normal mode)
    const navContainerStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(animation.value, [0, 1], [width - 100, 50]),
            height: 60,
            borderRadius: 30,
            backgroundColor: 'white',
            position: 'absolute',
            bottom: insets.bottom + 10,
            left: 20,
            opacity: interpolate(animation.value, [0, 0.5], [1, 0]),
            transform: [
                { translateX: interpolate(animation.value, [0, 1], [0, -100]) }
            ],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1,
        };
    });

    // Container 2: AI Button / Input (Right in normal mode)
    const aiContainerStyle = useAnimatedStyle(() => {
        const expandedWidth = width - 40;
        const backgroundColor = interpolateColor(
            animation.value,
            [0, 1],
            ['#2563eb', '#ffffff']
        );

        return {
            width: interpolate(animation.value, [0, 1], [60, expandedWidth]),
            height: 60,
            borderRadius: 30,
            backgroundColor: backgroundColor,
            position: 'absolute',
            bottom: insets.bottom + 10,
            right: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2,
            borderWidth: interpolate(animation.value, [0, 1], [0, 1]),
            borderColor: '#e2e8f0',
        };
    });

    // Close Button (Appears in AI Mode on the left)
    const closeButtonStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            bottom: insets.bottom + 10,
            left: 20,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: interpolate(animation.value, [0.5, 1], [0, 1]),
            transform: [
                { scale: interpolate(animation.value, [0.5, 1], [0.5, 1]) }
            ],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 3,
        };
    });

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Navigation Tabs (Pill) */}
            <Animated.View style={navContainerStyle}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    // Skip hidden routes
                    if ((options as any).href === null) return null;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                        >
                            {options.tabBarIcon?.({
                                focused: isFocused,
                                color: isFocused ? '#2563eb' : '#94a3b8',
                                size: 24
                            })}
                            {isFocused && (
                                <View style={styles.activeDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>

            {/* Close Button (For AI Mode) */}
            <Animated.View style={closeButtonStyle}>
                <TouchableOpacity onPress={toggleAIMode} style={styles.iconButton}>
                    <X size={24} color="#64748b" />
                </TouchableOpacity>
            </Animated.View>

            {/* AI Button / Input Field */}
            <Animated.View style={aiContainerStyle}>
                {!isAIMode ? (
                    <TouchableOpacity onPress={toggleAIMode} style={styles.iconButton}>
                        <Sparkles size={24} color="white" fill="white" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="اسأل الذكاء الاصطناعي..."
                            placeholderTextColor="#94a3b8"
                            value={inputText}
                            onChangeText={setInputText}
                            autoFocus
                        />
                        <TouchableOpacity style={styles.sendButton}>
                            <Send size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        // backgroundColor: 'transparent', // Ensure clicks pass through empty areas
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    activeDot: {
        position: 'absolute',
        bottom: 12,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#2563eb',
    },
    iconButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        paddingHorizontal: 20,
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: 'TajawalCustom',
        fontSize: 16,
        color: '#0f172a',
        textAlign: 'right', // RTL
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
