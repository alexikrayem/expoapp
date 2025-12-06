import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

export const useDeals = (cityId: string | null) => {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: ['deals', cityId],
        queryFn: () => productService.getDeals(cityId),
        enabled: !!cityId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        deals: data || [],
        isLoadingDeals: isLoading,
        dealError: isError ? (error as Error).message : null,
        refreshDeals: refetch,
        isRefetchingDeals: isRefetching
    };
};
