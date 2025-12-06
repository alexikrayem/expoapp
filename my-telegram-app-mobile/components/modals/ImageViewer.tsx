import React from 'react';
import { View, Modal, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import Text from '@/components/ThemedText';
import { X } from 'lucide-react-native';

interface ImageViewerProps {
    visible: boolean;
    imageUrl: string | null;
    onClose: () => void;
    imageName?: string;
}

const { width, height } = Dimensions.get('window');

export default function ImageViewer({ visible, imageUrl, onClose, imageName }: ImageViewerProps) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const reset = React.useCallback(() => {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const panGesture = React.useMemo(() => Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        }), [scale, savedTranslateX, savedTranslateY, translateX, translateY]);

    const pinchGesture = React.useMemo(() => Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
            } else {
                savedScale.value = scale.value;
            }
        }), [scale, savedScale]);

    const doubleTapGesture = React.useMemo(() => Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value !== 1) {
                reset();
            } else {
                scale.value = withSpring(2);
                savedScale.value = 2;
            }
        }), [scale, savedScale, reset]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    if (!imageUrl) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={24} color="white" />
                        </TouchableOpacity>
                        {imageName && (
                            <Text style={styles.title} numberOfLines={1}>
                                {imageName}
                            </Text>
                        )}
                        <View style={{ width: 40 }} />
                    </View>

                    <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture)}>
                        <View style={styles.imageContainer}>
                            <Animated.Image
                                source={{ uri: imageUrl }}
                                style={[styles.image, animatedStyle]}
                                resizeMode="contain"
                            />
                        </View>
                    </GestureDetector>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        maxWidth: '70%',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: width,
        height: height,
    },
});
