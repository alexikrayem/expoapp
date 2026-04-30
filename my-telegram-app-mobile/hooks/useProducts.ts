import { useInfiniteQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { useEffect, useMemo } from 'react';
import { PAGINATION } from '../utils/constants';
import { Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { prefetchImages } from '@/utils/image';

interface ProductFilters {
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    onSale?: boolean;
    supplier?: string;
    searchQuery?: string;
}

export const useProducts = (cityId: string | null | undefined, externalFilters: ProductFilters = {}) => {
    const effectiveFilters = useMemo(() => ({
        category: externalFilters.category || 'all',
        minPrice: externalFilters.minPrice || '',
        maxPrice: externalFilters.maxPrice || '',
        onSale: externalFilters.onSale || false,
        supplier: externalFilters.supplier || '',
        searchQuery: externalFilters.searchQuery || '',
    }), [
        externalFilters.category,
        externalFilters.minPrice,
        externalFilters.maxPrice,
        externalFilters.onSale,
        externalFilters.supplier,
        externalFilters.searchQuery
    ]);

    const debouncedFilters = useDebounce(effectiveFilters, 250);

    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey: ['products', cityId, debouncedFilters],
        queryFn: async ({ pageParam = 1, signal }) => {
            if (!cityId) return { items: [], currentPage: 1, totalPages: 1 };

            const params: Record<string, string | number | boolean> = {
                page: pageParam,
                limit: PAGINATION.PRODUCTS_PER_PAGE,
                cityId,
                ...debouncedFilters,
            };

            // Strip empty/default filter values before sending to the API
            const cleanedParams = Object.fromEntries(
                Object.entries(params).filter(([key, value]) => {
                    if (value === '' || value === 'all') return false;
                    if (key === 'onSale' && value === false) return false;
                    return true;
                })
            );

            return productService.getProducts(cleanedParams, { signal });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.currentPage < lastPage.totalPages) {
                return lastPage.currentPage + 1;
            }
            return undefined;
        },
        enabled: !!cityId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const products = useMemo(() => {
        return (data?.pages.flatMap(page => page.items || []) || []) as Product[];
    }, [data]);

    // Memoize the URL list so prefetchImages isn't called with a new array on every render
    const imageUrls = useMemo(
        () => products.map((item) => item.image_url),
        [products],
    );

    useEffect(() => {
        if (imageUrls.length === 0) return;
        prefetchImages(imageUrls, 12);
    }, [imageUrls]);

    return {
        products,
        isLoadingProducts: isLoading,
        productError: isError ? (error as Error).message : null,
        loadMoreProducts: fetchNextPage,
        hasMorePages: hasNextPage,
        isLoadingMore: isFetchingNextPage,
        refreshProducts: refetch,
        isRefetchingProducts: isRefetching,
    };
};
