import { apiClient } from '../api/apiClient';

export const userService = {
    getFavorites: () => {
        return apiClient('favorites');
    },
    addFavorite: (productId: string) => {
        return apiClient('favorites', {
            method: 'POST',
            body: { productId },
        });
    },
    removeFavorite: (productId: string) => {
        return apiClient(`favorites/${productId}`, {
            method: 'DELETE',
        });
    },
    updateProfile: (profileData: any) => {
        return apiClient('user/profile', {
            method: 'PUT',
            body: profileData,
        });
    },
    getProfile: () => {
        return apiClient('user/profile');
    }
};
