import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys that should be stored securely
const SECURE_KEYS = ['accessToken', 'refreshToken'];

export const storage = {
    async setItem(key: string, value: string) {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(key, value);
            } else {
                if (SECURE_KEYS.includes(key)) {
                    await SecureStore.setItemAsync(key, value);
                } else {
                    await AsyncStorage.setItem(key, value);
                }
            }
        } catch (e) {
            console.error('Error setting item:', e);
        }
    },

    async getItem(key: string) {
        try {
            if (Platform.OS === 'web') {
                return localStorage.getItem(key);
            } else {
                if (SECURE_KEYS.includes(key)) {
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

    async removeItem(key: string) {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(key);
            } else {
                if (SECURE_KEYS.includes(key)) {
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
