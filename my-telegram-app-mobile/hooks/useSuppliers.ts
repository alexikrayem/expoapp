import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

export const useSuppliers = (cityId: string | null) => {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: ['suppliers', cityId],
        queryFn: () => productService.getSuppliers(cityId),
        enabled: !!cityId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        suppliers: data || [],
        isLoadingSuppliers: isLoading,
        supplierError: isError ? (error as Error).message : null,
        refreshSuppliers: refetch,
        isRefetchingSuppliers: isRefetching
    };
};
