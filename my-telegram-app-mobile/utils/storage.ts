import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Keys that contain authentication secrets.
 *
 * - **Native (iOS/Android):** routed to `expo-secure-store` (Keychain / EncryptedSharedPreferences).
 * - **Web:** routed to `sessionStorage` (tab-scoped, cleared on close).
 *   `localStorage` is NOT used for secrets because any XSS payload can read it.
 *
 * For a production web target, prefer server-set `httpOnly` cookies instead.
 */
const SECURE_KEYS = ['accessToken', 'refreshToken'];

const isSecureKey = (key: string): boolean => SECURE_KEYS.includes(key);

export const storage = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (isSecureKey(key)) {
                    sessionStorage.setItem(key, value);
                } else {
                    localStorage.setItem(key, value);
                }
            } else {
                if (isSecureKey(key)) {
                    await SecureStore.setItemAsync(key, value);
                } else {
                    await AsyncStorage.setItem(key, value);
                }
            }
        } catch (e) {
            console.error('Error setting item:', e);
        }
    },

    async getItem(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                if (isSecureKey(key)) {
                    return sessionStorage.getItem(key);
                }
                return localStorage.getItem(key);
            } else {
                if (isSecureKey(key)) {
                    return await SecureStore.getItemAsync(key);
                } else {
                    return await AsyncStorage.getItem(key);
                }
            }
        } catch (e) {
            console.error('Error getting item:', e);
            return null;
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                if (isSecureKey(key)) {
                    sessionStorage.removeItem(key);
                } else {
                    localStorage.removeItem(key);
                }
            } else {
                if (isSecureKey(key)) {
                    await SecureStore.deleteItemAsync(key);
                } else {
                    await AsyncStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.error('Error removing item:', e);
        }
    }
};
