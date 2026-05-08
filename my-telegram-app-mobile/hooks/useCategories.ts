import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';

export const useCategories = (cityId: string | null) => {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['categories', cityId],
        queryFn: async () => {
            if (!cityId) return [];
            return productService.getProductCategories(cityId);
        },
        enabled: !!cityId,
        staleTime: 1000 * 60 * 30, // 30 minutes (categories change rarely)
    });

    return {
        categories: (data as { categories?: { category: string, product_count: number | null }[] })?.categories || [],
        isLoadingCategories: isLoading,
        categoriesError: isError ? (error as Error).message : null,
        refreshCategories: refetch
    };
};
