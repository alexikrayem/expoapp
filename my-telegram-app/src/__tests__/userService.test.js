import { userService } from '../services/userService';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the apiClient
vi.mock('../api/apiClient', () => ({
  apiClient: vi.fn(),
}));

describe('UserService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    test('should call apiClient with correct endpoint', async () => {
      const mockProfile = {
        id: 123,
        full_name: 'John Doe',
        phone_number: '+1234567890',
        clinic_name: 'Dental Clinic',
        profileCompleted: true
      };
      
      require('../api/apiClient').apiClient.mockResolvedValue(mockProfile);
      
      const result = await userService.getProfile();
      
      expect(require('../api/apiClient').apiClient).toHaveBeenCalledWith('user/profile');
      expect(result).toEqual(mockProfile);
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Failed to fetch profile');
      require('../api/apiClient').apiClient.mockRejectedValue(mockError);
      
      await expect(userService.getProfile()).rejects.toThrow('Failed to fetch profile');
    });
  });

  describe('updateProfile', () => {
    test('should call apiClient with correct endpoint and data', async () => {
      const testData = {
        full_name: 'John Doe',
        phone_number: '+1234567890',
        clinic_name: 'Dental Clinic',
        clinic_phone: '+9876543210'
      };
      
      const mockResponse = {
        ...testData,
        updated: true
      };
      
      require('../api/apiClient').apiClient.mockResolvedValue(mockResponse);
      
      const result = await userService.updateProfile(testData);
      
      expect(require('../api/apiClient').apiClient).toHaveBeenCalledWith('user/profile', {
        method: 'PUT',
        body: testData,
      });
      expect(result).toEqual(mockResponse);
    });

    test('should handle update errors', async () => {
      const testData = {
        full_name: 'John Doe',
        phone_number: '+1234567890'
      };
      
      const mockError = new Error('Failed to update profile');
      require('../api/apiClient').apiClient.mockRejectedValue(mockError);
      
      await expect(userService.updateProfile(testData)).rejects.toThrow('Failed to update profile');
    });
  });

  describe('favorite management', () => {
    test('getFavorites should call correct endpoint', async () => {
      const mockFavorites = [{ id: 1, name: 'Product 1' }];
      require('../api/apiClient').apiClient.mockResolvedValue(mockFavorites);
      
      const result = await userService.getFavorites();
      
      expect(require('../api/apiClient').apiClient).toHaveBeenCalledWith('favorites');
      expect(result).toEqual(mockFavorites);
    });

    test('addFavorite should call correct endpoint', async () => {
      const mockProduct = { id: 1, name: 'Product 1' };
      const productId = 1;
      
      require('../api/apiClient').apiClient.mockResolvedValue(mockProduct);
      
      const result = await userService.addFavorite(productId);
      
      expect(require('../api/apiClient').apiClient).toHaveBeenCalledWith('favorites', {
        method: 'POST',
        body: { productId },
      });
      expect(result).toEqual(mockProduct);
    });

    test('removeFavorite should call correct endpoint', async () => {
      const productId = 1;
      
      require('../api/apiClient').apiClient.mockResolvedValue({});
      
      await userService.removeFavorite(productId);
      
      expect(require('../api/apiClient').apiClient).toHaveBeenCalledWith(`favorites/${productId}`, {
        method: 'DELETE',
      });
    });
  });
});