import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the apiClient module
vi.mock('../api/apiClient', () => ({
  apiClient: vi.fn(),
  setTokens: vi.fn()
}));

// Mock tokenManager
vi.mock('../utils/tokenManager', () => ({
  isAccessTokenValid: vi.fn()
}));

import { authService } from '../services/authService';
import { apiClient, setTokens } from '../api/apiClient';
import { isAccessTokenValid } from '../utils/tokenManager';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('sends OTP request with phone number', async () => {
      apiClient.mockResolvedValue({ success: true, message: 'OTP sent' });

      const result = await authService.sendOtp('+1234567890');

      expect(apiClient).toHaveBeenCalledWith('auth/send-otp', {
        method: 'POST',
        body: { phone_number: '+1234567890' }
      });
      expect(result).toEqual({ success: true, message: 'OTP sent' });
    });
  });

  describe('verifyOtp', () => {
    it('verifies OTP and stores token if user exists', async () => {
      apiClient.mockResolvedValue({
        accessToken: 'new-access-token',
        isNew: false
      });

      const result = await authService.verifyOtp('+1234567890', '123456');

      expect(apiClient).toHaveBeenCalledWith('auth/verify-otp', {
        method: 'POST',
        body: { phone_number: '+1234567890', code: '123456' }
      });
      expect(setTokens).toHaveBeenCalledWith('new-access-token');
      expect(result.isNew).toBe(false);
    });

    it('does not store token if user is new', async () => {
      apiClient.mockResolvedValue({
        isNew: true,
        message: 'User not found, please register'
      });

      const result = await authService.verifyOtp('+1234567890', '123456');

      expect(setTokens).not.toHaveBeenCalled();
      expect(result.isNew).toBe(true);
    });
  });

  describe('registerWithPhone', () => {
    it('registers new user and stores token', async () => {
      const profileData = {
        full_name: 'Test User',
        address_line1: '123 Test St',
        city: 'Test City'
      };

      apiClient.mockResolvedValue({
        accessToken: 'registration-token',
        user: { id: 1 }
      });

      const result = await authService.registerWithPhone('+1234567890', '123456', profileData);

      expect(apiClient).toHaveBeenCalledWith('auth/register-phone', {
        method: 'POST',
        body: {
          phone_number: '+1234567890',
          code: '123456',
          profileData
        }
      });
      expect(setTokens).toHaveBeenCalledWith('registration-token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when access token is valid', () => {
      isAccessTokenValid.mockReturnValue(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when access token is invalid', () => {
      isAccessTokenValid.mockReturnValue(false);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('fetches user profile', async () => {
      apiClient.mockResolvedValue({
        id: 1,
        full_name: 'Test User',
        phone_number: '+1234567890'
      });

      const result = await authService.getProfile();

      expect(apiClient).toHaveBeenCalledWith('user/profile');
      expect(result.full_name).toBe('Test User');
    });
  });
});