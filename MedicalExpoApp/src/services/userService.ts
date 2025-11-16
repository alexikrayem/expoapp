import { apiClient } from './apiClient';

export const userService = {
  getProfile: () => {
    return apiClient.get('user/profile');
  },

  updateProfile: (profileData: any) => {
    return apiClient.put('user/profile', profileData);
  },

  getFavorites: () => {
    return apiClient.get('favorites');
  },

  addFavorite: (productId: string) => {
    return apiClient.post('favorites', { productId });
  },

  removeFavorite: (productId: string) => {
    return apiClient.delete(`favorites/${productId}`);
  },
};