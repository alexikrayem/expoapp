import { apiClient } from '../api/apiClient';

export const userService = {
    getProfile: () => {
        // The user ID is determined securely by the backend using the Telegram auth middleware
        return apiClient('user/profile');
    },

    updateProfile: (profileData) => {
        return apiClient('user/profile', {
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
