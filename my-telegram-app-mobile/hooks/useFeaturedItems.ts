import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

export const useFeaturedItems = () => {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: ['featured-items'],
        queryFn: () => productService.getFeaturedItems(),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    return {
        featuredItems: data || [],
        isLoadingFeatured: isLoading,
        featuredError: isError ? (error as Error).message : null,
        refreshFeatured: refetch,
        isRefetchingFeatured: isRefetching
    };
};
