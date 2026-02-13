import React, { useState } from 'react';
import { View, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Text from '@/components/ThemedText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { X, Star, Send } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import PressableScale from '@/components/ui/PressableScale';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const { showToast } = useToast();

    const handleSubmit = () => {
        if (rating === 0) {
            showToast('الرجاء اختيار تقييم', 'error');
            return;
        }

        // Here you would typically send the feedback to your backend
        console.log({ rating, comment });

        showToast('شكراً لك على ملاحظاتك!', 'success');
        setRating(0);
        setComment('');
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1 bg-black/60 justify-center items-center p-5 backdrop-blur-sm">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="w-full max-w-md"
                    >
                        <View className="bg-surface rounded-3xl p-6 shadow-2xl w-full">
                            <View className="flex-row justify-between items-center mb-6">
                                <PressableScale onPress={onClose} scaleTo={0.9} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} color="#64748b" />
                                </PressableScale>
                                <Text className="text-xl font-bold text-text-main">أرسل ملاحظاتك</Text>
                            </View>

                            <View className="items-center mb-8">
                                <Text className="text-text-secondary mb-4 font-medium">كيف كانت تجربتك؟</Text>
                                <View className="flex-row gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <PressableScale
                                            key={star}
                                            onPress={() => setRating(star)}
                                            scaleTo={1.06}
                                        >
                                            <Star
                                                size={32}
                                                color={rating >= star ? "#f59e0b" : "#e2e8f0"}
                                                fill={rating >= star ? "#f59e0b" : "transparent"}
                                            />
                                        </PressableScale>
                                    ))}
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-right text-text-main font-bold mb-2">ملاحظات إضافية</Text>
                                <Input
                                    placeholder="اكتب ملاحظاتك هنا..."
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    textAlignVertical="top"
                                    className="text-right"
                                    style={{ minHeight: 128 }}
                                />
                            </View>

                            <Button
                                title="إرسال"
                                onPress={handleSubmit}
                                size="lg"
                                rightIcon={<Send size={20} color="white" />}
                                className="shadow-lg shadow-primary-500/30"
                            />
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
