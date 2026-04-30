import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';

const POLL_INTERVAL_MS = 15_000; // 15 seconds (was 5s — reduces battery drain)

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const checkNetworkStatus = useCallback(async () => {
        try {
            const status = await Network.getNetworkStateAsync();
            // On iOS, isInternetReachable can be null initially, so we fallback to isConnected
            const online = status.isConnected && (status.isInternetReachable ?? true);
            setIsOnline(!!online);
        } catch (_error) {
            // Assume online on error to avoid blocking user
            setIsOnline(true);
        }
    }, []);

    const startPolling = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(checkNetworkStatus, POLL_INTERVAL_MS);
    }, [checkNetworkStatus]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        // Initial check + start polling
        checkNetworkStatus();
        startPolling();

        // Pause polling when app is backgrounded to save battery
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                checkNetworkStatus();
                startPolling();
            } else {
                stopPolling();
            }
        });

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [checkNetworkStatus, startPolling, stopPolling]);

    return { isOnline };
}

