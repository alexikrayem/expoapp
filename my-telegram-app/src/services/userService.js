import { apiClient } from '../api/apiClient';

export const userService = {
    getProfile: () => {
        // The user ID is determined securely by the backend using the Telegram auth middleware
        return apiClient('api/user/profile');
    },

    updateProfile: (profileData) => {
        return apiClient('api/user/profile', {
            method: 'PUT',
            body: profileData,
        });
    },

    getFavorites: () => {
        return apiClient('api/favorites');
    },

    addFavorite: (productId) => {
        return apiClient('api/favorites', {
            method: 'POST',
            body: { productId },
        });
    },

    removeFavorite: (productId) => {
        return apiClient(`api/favorites/${productId}`, {
            method: 'DELETE',
        });
    },
};
