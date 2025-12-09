import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import Text from '@/components/ThemedText';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    interpolate,
    interpolateColor,
    Extrapolation,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Check, ChevronRight, X } from 'lucide-react-native';

const BUTTON_HEIGHT = 64;
const PADDING = 4;
const THUMB_SIZE = BUTTON_HEIGHT - PADDING * 2;

interface CheckoutSliderProps {
    onSlideComplete: () => void;
    onDone?: () => void;
    onCancel?: () => void;
    isLoading?: boolean;
    enabled?: boolean;
    initialText?: string;
}

const CheckoutSlider: React.FC<CheckoutSliderProps> = ({
    onSlideComplete,
    onDone,
    onCancel,
    isLoading = false,
    enabled = true,
    initialText = "اسحب لتأكيد الطلب",
}) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showActions, setShowActions] = useState(false);

    // Reanimated Shared Values
    const translateX = useSharedValue(0);
    const animatedSuccess = useSharedValue(0); // 0 (initial) to 1 (complete)
    const context = useSharedValue(0);

    const handleLayout = (e: any) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    const maxDrag = useMemo(() => {
        return containerWidth - THUMB_SIZE - PADDING * 2;
    }, [containerWidth]);

    const resetSlider = () => {
        translateX.value = withTiming(0, { duration: 300 });
        animatedSuccess.value = withTiming(0, { duration: 300 });
        setIsComplete(false);
        setShowActions(false);
    };

    const handleCancel = () => {
        resetSlider();
        onCancel?.();
    };

    const handleDone = () => {
        onDone?.();
    };

    useEffect(() => {
        if (!enabled) {
            translateX.value = withTiming(0);
            animatedSuccess.value = withTiming(0);
            setIsComplete(false);
            setShowActions(false);
        }
    }, [enabled]);

    const pan = Gesture.Pan()
        .onStart(() => {
            if (!enabled || isComplete || isLoading) return;
            context.value = translateX.value;
        })
        .onUpdate((event) => {
            if (!enabled || isComplete || isLoading) return;
            const newX = Math.max(0, Math.min(maxDrag, context.value + event.translationX));
            translateX.value = newX;
        })
        .onEnd(() => {
            if (!enabled || isComplete || isLoading) return;
            if (translateX.value > maxDrag * 0.7) {
                translateX.value = withTiming(maxDrag, { duration: 200 }, (isFinished) => {
                    if (isFinished) {
                        animatedSuccess.value = withTiming(1, { duration: 300 }, (isCompleteFinished) => {
                            if (isCompleteFinished) {
                                runOnJS(setIsComplete)(true);
                                runOnJS(setShowActions)(true);
                            }
                        });
                    }
                });
            } else {
                translateX.value = withTiming(0, { duration: 300 });
            }
        });

    const pillStyle = useAnimatedStyle(() => {
        const widthDuringDrag = interpolate(
            translateX.value,
            [0, maxDrag],
            [containerWidth, THUMB_SIZE + PADDING * 2],
            Extrapolation.CLAMP
        );

        const finalWidth = interpolate(animatedSuccess.value, [0, 1], [widthDuringDrag, THUMB_SIZE + PADDING * 2]);

        const backgroundColor = interpolateColor(
            animatedSuccess.value,
            [0, 1],
            ['#16a34a', '#FFFFFF']
        );

        const borderColor = interpolateColor(
            animatedSuccess.value,
            [0, 1],
            ['#16a34a', '#16a34a']
        );

        return {
            width: containerWidth ? finalWidth : '100%',
            backgroundColor,
            borderColor,
            borderWidth: interpolate(animatedSuccess.value, [0, 1], [0, 2]),
            opacity: enabled ? 1 : 0.5,
        };
    });

    const thumbStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            opacity: isComplete ? 0 : 1,
        };
    });

    const textStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, maxDrag / 2],
            [1, 0],
            Extrapolation.CLAMP
        );

        return {
            opacity: isComplete ? 0 : opacity,
        };
    });

    return (
        <View style={styles.container} onLayout={handleLayout}>
            <Animated.View style={[styles.pill, pillStyle]}>
                <View style={[styles.staticTextContainer, { width: containerWidth }]}>
                    <Animated.View style={textStyle}>
                        <Text style={styles.text}>{initialText}</Text>
                    </Animated.View>
                </View>
            </Animated.View>

            {/* Success state with tick and action buttons */}
            {showActions && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.actionsContainer}
                >
                    {/* Checkmark */}
                    <View style={styles.successIcon}>
                        <Check color="#16a34a" size={28} />
                    </View>

                    {/* Cancel Button - Red Pill */}
                    <TouchableOpacity
                        onPress={handleCancel}
                        style={styles.cancelButton}
                        activeOpacity={0.8}
                    >
                        <X color="#ffffff" size={18} />
                        <Text style={styles.cancelButtonText}>إلغاء</Text>
                    </TouchableOpacity>

                    {/* Done Button - Blue Pill */}
                    <TouchableOpacity
                        onPress={handleDone}
                        style={styles.doneButton}
                        activeOpacity={0.8}
                    >
                        <Check color="#ffffff" size={18} />
                        <Text style={styles.doneButtonText}>تأكيد</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.thumb, thumbStyle]}>
                    {isLoading ? (
                        <ActivityIndicator color="#16a34a" size="small" />
                    ) : (
                        <ChevronRight color="#16a34a" size={28} />
                    )}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: BUTTON_HEIGHT,
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
    },
    pill: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: BUTTON_HEIGHT / 2,
        overflow: 'hidden',
        justifyContent: 'center',
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    staticTextContainer: {
        position: 'absolute',
        right: 0,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        fontFamily: 'TajawalCustom',
    },
    thumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: PADDING,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        right: 0,
        left: 0,
        top: 0,
        bottom: 0,
        gap: 10,
    },
    successIcon: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#16a34a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        flex: 1,
        height: THUMB_SIZE,
        backgroundColor: '#ef4444',
        borderRadius: THUMB_SIZE / 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'TajawalCustom',
    },
    doneButton: {
        flex: 1,
        height: THUMB_SIZE,
        backgroundColor: '#2563eb',
        borderRadius: THUMB_SIZE / 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'TajawalCustom',
    },
});

export default CheckoutSlider;

