import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        checkNetworkStatus();

        // Unfortunately, expo-network doesn't have a direct event listener for state changes 
        // that works consistently across all platforms without additional setup (like NetInfo).
        // However, for a simple check, we can poll or check on focus. 
        // For a more robust solution, @react-native-community/netinfo is recommended, 
        // but we'll stick to expo-network as requested if possible.
        // Actually, let's use a simple polling mechanism for now or just initial check.
        // Better yet, let's use the standard NetInfo if we want real-time updates, 
        // but since we are using Expo, let's see if we can just check periodically.

        // NOTE: For real-time updates, @react-native-community/netinfo is the standard.
        // expo-network is mostly for one-off checks.
        // But let's implement a simple poller for now to avoid adding another native dependency if not needed.

        const interval = setInterval(checkNetworkStatus, 5000);

        return () => clearInterval(interval);
    }, []);

    const checkNetworkStatus = async () => {
        try {
            const status = await Network.getNetworkStateAsync();
            // Consider online if connected and internet is reachable
            // On iOS, isInternetReachable can be null initially, so we fallback to isConnected
            const online = status.isConnected && (status.isInternetReachable ?? true);
            setIsOnline(!!online);
        } catch (error) {
            console.error('Network check failed:', error);
            // Assume online on error to avoid blocking user
            setIsOnline(true);
        }
    };

    return { isOnline };
}
