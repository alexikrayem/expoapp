import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { prefetchImages } from '@/utils/image';
import { Product } from '@/types';

export const useFavoriteProducts = (favoriteIds: Set<string>, active: boolean) => {
    const idsArray = useMemo(() => Array.from(favoriteIds).sort(), [favoriteIds]);
    const idsKey = useMemo(() => idsArray.join(','), [idsArray]);

    const { data, isLoading, error } = useQuery<Product[]>({
        queryKey: ['favorite-products', idsKey],
        queryFn: () => productService.getProductBatch(idsArray.join(',')),
        enabled: active && favoriteIds.size > 0,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    const products = data || [];

    useEffect(() => {
        if (products.length === 0) return;
        prefetchImages(
            products.map((item: any) => item.image_url || item.imageUrl || item.image),
            12
        );
    }, [products]);

    return {
        favoriteProducts: products,
        isLoadingFavoritesTab: isLoading,
        favoritesTabError: error ? (error as Error).message : null,
    };
};

