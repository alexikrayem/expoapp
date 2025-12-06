import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { useToast } from '@/context/ToastContext';

export const useFavorites = (telegramUser: any) => {
    const { showToast } = useToast();
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFavoriteIds = useCallback(async () => {
        console.log("useFavorites: Checking auth...");
        const isAuth = await authService.isAuthenticated();
        console.log("useFavorites: isAuth =", isAuth);

        if (!isAuth) {
            setFavoriteIds(new Set());
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            console.log("useFavorites: Fetching favorites from API...");
            const result = await userService.getFavorites();
            console.log("useFavorites: API Result =", result);
            setFavoriteIds(new Set(result.favorite_ids || []));
        } catch (err: any) {
            console.error("Failed to fetch favorites:", err);
            setError("Could not load your favorites.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavoriteIds();
    }, [fetchFavoriteIds]);

    const toggleFavorite = useCallback(async (productId: string) => {
        const isCurrentlyFavorite = favoriteIds.has(productId);

        const newFavoriteIds = new Set(favoriteIds);
        if (isCurrentlyFavorite) {
            newFavoriteIds.delete(productId);
        } else {
            newFavoriteIds.add(productId);
        }
        setFavoriteIds(newFavoriteIds);

        try {
            if (isCurrentlyFavorite) {
                await userService.removeFavorite(productId);
                showToast('تم إزالة المنتج من المفضلة', 'info');
            } else {
                await userService.addFavorite(productId);
                showToast('تم إضافة المنتج إلى المفضلة', 'success');
            }
        } catch (error: any) {
            console.error("Error toggling favorite:", error);
            setFavoriteIds(favoriteIds);
            showToast(`خطأ: ${error.message}`, 'error');
        }
    }, [favoriteIds, showToast]);

    return {
        favoriteIds,
        isLoadingFavorites: isLoading,
        favoritesError: error,
        toggleFavorite,
        isFavorite: (productId: string) => favoriteIds.has(productId)
    };
};
