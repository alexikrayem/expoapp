// src/services/userService.js
import { apiClient } from '../api/apiClient';

export const userService = {
   
    getProfile: () => {
        // The user ID is now determined securely by the backend.
        return apiClient('profile');
    },

    
    updateProfile: (profileData) => {
        return apiClient('profile', {
            method: 'PUT',
            body: profileData,
        });
    },
  
    getFavorites: () => {
        return apiClient('favorites');
    },
  


   
    addFavorite: (productId) => {
        return apiClient('favorites', {
            method: 'POST',
            body: { productId },
        });
    },

    removeFavorite: (productId) => {
        return apiClient(`favorites/${productId}`, {
            method: 'DELETE',
        });
    },
};