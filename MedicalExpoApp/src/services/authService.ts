import { apiClient } from './apiClient';
import Environment from '../config/environment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IS_DEVELOPMENT = !Environment.API_BASE_URL.includes('production');

export const authService = {
  // Telegram Login Widget authentication
  telegramLoginWidget: async (authData: any) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // In development mode, we send the bypass header
    if (IS_DEVELOPMENT) {
      headers['X-Dev-Bypass-Auth'] = Environment.DEV_BYPASS_TOKEN || '';
      console.log("Dev bypass header:", headers['X-Dev-Bypass-Auth']);
      console.log("API URL:", `${Environment.API_BASE_URL}/${Environment.API_VERSION}/auth/telegram-login-widget`);
    }

    try {
      // Call the telegram-login-widget endpoint
      const response = await fetch(`${Environment.API_BASE_URL}/${Environment.API_VERSION}/auth/telegram-login-widget`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ authData }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        error.status = response.status;
        throw error;
      }

      const data = await response.json();

      // If the response contains tokens, store them using apiClient
      if (data.accessToken && data.refreshToken) {
        await apiClient.setToken(data.accessToken);
        // For refresh token, we might want to store it separately if needed
      }

      return data;
    } catch (error: any) {
      console.error('Telegram login error:', error);
      throw error;
    }
  },

  devBypassLogin: async () => {
    if (!IS_DEVELOPMENT) {
      console.error('Development bypass login is only available in development mode.');
      return null;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    headers['X-Dev-Bypass-Auth'] = Environment.DEV_BYPASS_TOKEN || '';

    try {
      const response = await fetch(`${Environment.API_BASE_URL}/${Environment.API_VERSION}/auth/telegram-login-widget`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        error.status = response.status;
        throw error;
      }

      const data = await response.json();

      if (data.accessToken && data.refreshToken) {
        await apiClient.setToken(data.accessToken);
      }

      return data;
    } catch (error: any) {
      console.error('Dev bypass login error:', error);
      throw error;
    }
  },

  // Check if user is authenticated (has valid tokens)
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  },

  // Get current user profile (using JWT tokens)
  getProfile: () => {
    // This will use the stored JWT tokens
    return apiClient.get('user/profile');
  }
};