import { apiClient } from '../api/apiClient';
import type { UserProfile, FavoritesResponse } from '../types';

export const userService = {
    getFavorites: () => {
        return apiClient<FavoritesResponse>('favorites');
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
    updateProfile: (profileData: Partial<UserProfile>) => {
        return apiClient<UserProfile>('user/profile', {
            method: 'PUT',
            body: profileData,
        });
    },
    getProfile: () => {
        return apiClient<UserProfile>('user/profile');
    }
};
