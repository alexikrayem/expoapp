import React, { useEffect, useState } from 'react';
import { View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '@/components/ThemedText';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function OfflineOverlay() {
    const { isOnline } = useNetworkStatus();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setVisible(true);
        } else {
            // Delay hiding to prevent flickering
            const timer = setTimeout(() => setVisible(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (!visible) return null;

    return (
        <View className="absolute bottom-0 left-0 right-0 bg-red-500 p-2 z-50 items-center justify-center flex-row">
            <SafeAreaView className="flex-row items-center">
                <WifiOff size={20} color="white" />
                <Text className="text-white ml-2 font-medium">لا يوجد اتصال بالإنترنت</Text>
            </SafeAreaView>
        </View>
    );
}
