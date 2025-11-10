// src/hooks/useFavorites.js (JWT-AUTHENTICATED VERSION)
import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';

export const useFavorites = (telegramUser) => {
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFavoriteIds = useCallback(async () => {
        // Check if user is authenticated using JWT tokens instead of telegramUser
        if (!authService.isAuthenticated()) {
            setFavoriteIds(new Set());
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // This now calls our new, secure service method
            const result = await userService.getFavorites();
            // The backend should return an object like { favorite_ids: [1, 2, 3] }
            setFavoriteIds(new Set(result.favorite_ids || []));
        } catch (err) {
            console.error("Failed to fetch favorites:", err);
            setError("Could not load your favorites.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavoriteIds();
    }, [fetchFavoriteIds]);

    const toggleFavorite = useCallback(async (productId) => {
        const isCurrentlyFavorite = favoriteIds.has(productId);

        // Optimistic UI update: update the state immediately
        const newFavoriteIds = new Set(favoriteIds);
        if (isCurrentlyFavorite) {
            newFavoriteIds.delete(productId);
        } else {
            newFavoriteIds.add(productId);
        }
        setFavoriteIds(newFavoriteIds);

        // Make the API call
        try {
            if (isCurrentlyFavorite) {
                await userService.removeFavorite(productId);
            } else {
                await userService.addFavorite(productId);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            // Revert UI on failure
            setFavoriteIds(favoriteIds);
            alert(`Error: ${error.message}`);
        }
    }, [favoriteIds]);

    return {
        favoriteIds,
        isLoadingFavorites: isLoading,
        favoritesError: error,
        toggleFavorite,
        isFavorite: (productId) => favoriteIds.has(productId)
    };
};