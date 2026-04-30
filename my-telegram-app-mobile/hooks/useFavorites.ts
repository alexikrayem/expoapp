import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { useToast } from '@/context/ToastContext';

const normalizeProductId = (productId: string | number) => String(productId);

/**
 * useFavorites Hook
 * 
 * Manages the user's favorite products using React Query for server state management.
 * Provides functions to check if a product is favorited and toggle its favorite status.
 */
export const useFavorites = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Query to fetch favorite IDs
    const { data, isLoading, error } = useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const result = await userService.getFavorites();
            return new Set<string>((result?.favorite_ids || []).map((id: string | number) => String(id)));
        },
    });

    // Mutation to add a product to favorites
    const addMutation = useMutation({
        mutationFn: (productId: string | number) => userService.addFavorite(normalizeProductId(productId)),
        onMutate: async (productId) => {
            const normalizedId = normalizeProductId(productId as string | number);
            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previousFavorites = queryClient.getQueryData<Set<string>>(['favorites']);
            queryClient.setQueryData(['favorites'], (old: Set<string> | undefined) => {
                const next = new Set(old || []);
                next.add(normalizedId);
                return next;
            });
            return { previousFavorites };
        },
        onSuccess: () => {
            showToast('تم إضافة المنتج إلى المفضلة', 'success');
        },
        onError: (err: any, productId, context) => {
            queryClient.setQueryData(['favorites'], context?.previousFavorites);
            showToast(`خطأ: ${err.message || 'فشل في إضافة المنتج إلى المفضلة'}`, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    // Mutation to remove a product from favorites
    const removeMutation = useMutation({
        mutationFn: (productId: string | number) => userService.removeFavorite(normalizeProductId(productId)),
        onMutate: async (productId) => {
            const normalizedId = normalizeProductId(productId as string | number);
            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previousFavorites = queryClient.getQueryData<Set<string>>(['favorites']);
            queryClient.setQueryData(['favorites'], (old: Set<string> | undefined) => {
                const next = new Set(old || []);
                next.delete(normalizedId);
                return next;
            });
            return { previousFavorites };
        },
        onSuccess: () => {
            showToast('تم إزالة المنتج من المفضلة', 'info');
        },
        onError: (err: any, productId, context) => {
            queryClient.setQueryData(['favorites'], context?.previousFavorites);
            showToast(`خطأ: ${err.message || 'فشل في إزالة المنتج من المفضلة'}`, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const favoriteIds = useMemo(() => data ?? new Set<string>(), [data]);

    const isFavorite = useCallback(
        (productId: string | number) => favoriteIds.has(normalizeProductId(productId)),
        [favoriteIds]
    );

    const toggleFavorite = useCallback(async (productId: string | number) => {
        const normalizedId = normalizeProductId(productId);
        if (favoriteIds.has(normalizedId)) {
            await removeMutation.mutateAsync(normalizedId);
        } else {
            await addMutation.mutateAsync(normalizedId);
        }
    }, [favoriteIds, addMutation, removeMutation]);

    return {
        favoriteIds,
        isLoadingFavorites: isLoading,
        favoritesError: error,
        toggleFavorite,
        isFavorite
    };
};
