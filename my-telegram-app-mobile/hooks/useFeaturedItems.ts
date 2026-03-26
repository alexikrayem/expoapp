import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { prefetchImages } from '@/utils/image';

export const useFeaturedItems = () => {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: ['featured-items'],
        queryFn: () => productService.getFeaturedItems(),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    useEffect(() => {
        if (!data || !Array.isArray(data)) return;
        prefetchImages(
            data.map((item: any) => item.imageUrl || item.image_url),
            8
        );
    }, [data]);

    return {
        featuredItems: data || [],
        isLoadingFeatured: isLoading,
        featuredError: isError ? (error as Error).message : null,
        refreshFeatured: refetch,
        isRefetchingFeatured: isRefetching
    };
};
