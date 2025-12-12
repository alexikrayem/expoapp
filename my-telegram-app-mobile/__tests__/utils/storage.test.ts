import { storage } from "@/utils/storage";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
}));

describe("Storage Utility", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = 'ios'; // Default to mobile
    });

    it("should use SecureStore for accessToken", async () => {
        await storage.setItem('accessToken', 'secret');
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'secret');
        expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("should use AsyncStorage for non-secure keys", async () => {
        await storage.setItem('theme', 'dark');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it("should get item from SecureStore for refreshToken", async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
        const value = await storage.getItem('refreshToken');
        expect(value).toBe('token');
        expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refreshToken');
    });
});
