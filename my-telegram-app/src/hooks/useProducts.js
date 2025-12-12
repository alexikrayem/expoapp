import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { PAGINATION } from '../utils/constants';

export const useProducts = (cityId, externalFilters = {}) => {
    // Memoize filters to ensure stable query keys
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
        queryKey: ['products', cityId, effectiveFilters],
        queryFn: async ({ pageParam = 1 }) => {
            if (!cityId) return { items: [], currentPage: 1, totalPages: 1 };

            const params = {
                page: pageParam,
                limit: PAGINATION.PRODUCTS_PER_PAGE,
                cityId,
                ...effectiveFilters,
            };

            // Clean up empty filter values
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === 'all' || (key === 'onSale' && params[key] === false)) {
                    delete params[key];
                }
            });

            return productService.getProducts(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.currentPage < lastPage.totalPages) {
                return lastPage.currentPage + 1;
            }
            return undefined;
        },
        enabled: !!cityId,
        staleTime: 1000 * 60 * 3, // 3 minutes
    });

    // Flatten pages into a single products array
    const products = useMemo(() => {
        return data?.pages.flatMap(page => page.items || []) || [];
    }, [data]);

    return {
        products,
        isLoadingProducts: isLoading,
        productError: isError ? (error?.message || "Failed to load products") : null,

        loadMoreProducts: fetchNextPage,
        hasMorePages: hasNextPage,
        isLoadingMore: isFetchingNextPage,

        refreshProducts: refetch,
        isRefetchingProducts: isRefetching,
    };
};