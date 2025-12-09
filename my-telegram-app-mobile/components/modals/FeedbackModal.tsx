import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Text from '@/components/ThemedText';
import { X, Star, Send } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';

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
                                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} color="#64748b" />
                                </TouchableOpacity>
                                <Text className="text-xl font-bold text-text-main">أرسل ملاحظاتك</Text>
                            </View>

                            <View className="items-center mb-8">
                                <Text className="text-text-secondary mb-4 font-medium">كيف كانت تجربتك؟</Text>
                                <View className="flex-row gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => setRating(star)}
                                            className="active:scale-110 transition-transform"
                                        >
                                            <Star
                                                size={32}
                                                color={rating >= star ? "#f59e0b" : "#e2e8f0"}
                                                fill={rating >= star ? "#f59e0b" : "transparent"}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View className="mb-6">
                                <Text className="text-right text-text-main font-bold mb-2">ملاحظات إضافية</Text>
                                <TextInput
                                    className="bg-white border border-border rounded-xl p-4 text-right h-32 text-text-main"
                                    placeholder="اكتب ملاحظاتك هنا..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    textAlignVertical="top"
                                    value={comment}
                                    onChangeText={setComment}
                                    style={{ fontFamily: 'TajawalCustom' }}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                className="w-full bg-primary-600 py-4 rounded-xl shadow-lg shadow-primary-500/30 flex-row items-center justify-center active:scale-[0.98]"
                            >
                                <Text className="text-white font-bold text-lg mr-2">إرسال</Text>
                                <Send size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
