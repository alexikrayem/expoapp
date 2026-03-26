import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { useEffect } from 'react';
import { prefetchImages } from '@/utils/image';

export const useSuppliers = (cityId: string | null) => {
    const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
        queryKey: ['suppliers', cityId],
        queryFn: () => productService.getSuppliers(cityId),
        enabled: !!cityId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (!data || !Array.isArray(data)) return;
        prefetchImages(
            data.map((supplier: any) => supplier.logoUrl || supplier.logo_url || supplier.logo),
            12
        );
    }, [data]);

    return {
        suppliers: data || [],
        isLoadingSuppliers: isLoading,
        supplierError: isError ? (error as Error).message : null,
        refreshSuppliers: refetch,
        isRefetchingSuppliers: isRefetching
    };
};
