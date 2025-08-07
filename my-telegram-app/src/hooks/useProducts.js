// src/hooks/useProducts.js - Enhanced with caching
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import { useCache } from '../context/CacheContext';
import { PAGINATION } from '../utils/constants';

export const useProducts = (cityId) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [filters, setFilters] = useState({
        category: 'all',
        minPrice: '',
        maxPrice: '',
        onSale: false,
    });

    const { cachedApiCall, invalidateCache } = useCache();

    const fetchProducts = useCallback(async (pageToFetch, appliedFilters) => {
        if (!cityId) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        // Create cache key based on parameters
        const cacheKey = `products_${cityId}_${pageToFetch}_${JSON.stringify(appliedFilters)}`;

        // Set loading states
        if (pageToFetch === 1) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        setError(null);

        try {
            const params = {
                page: pageToFetch,
                limit: PAGINATION.PRODUCTS_PER_PAGE,
                cityId,
                ...appliedFilters,
            };

            // Clean up empty filter values before sending to API
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === 'all' || params[key] === false) {
                    delete params[key];
                }
            });

            // Use cached API call
            const data = await cachedApiCall(
                cacheKey,
                () => productService.getProducts(params),
                3 * 60 * 1000 // 3 minutes cache for products
            );
            
            if (pageToFetch === 1) {
                setProducts(data.items);
            } else {
                setProducts(prev => [...prev, ...data.items]);
            }

            setCurrentPage(data.currentPage);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Error fetching products:", err);
            setError(err.message);
            if (pageToFetch === 1) setProducts([]);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [cityId, cachedApiCall]);

    // Effect to refetch products when cityId or filters change
    useEffect(() => {
        // Reset and fetch from page 1 whenever filters or city changes
        setCurrentPage(1); 
        fetchProducts(1, filters);
    }, [cityId, filters, fetchProducts]);

    const handleFiltersChange = (newFilters) => {
        // Invalidate cache when filters change
        invalidateCache(`products_${cityId}`);
        setFilters(newFilters);
    };
    
    const loadMoreProducts = () => {
        if (isLoadingMore || currentPage >= totalPages) return;
        const nextPage = currentPage + 1;
        fetchProducts(nextPage, filters);
    };

    const refreshProducts = useCallback(() => {
        invalidateCache(`products_${cityId}`);
        setCurrentPage(1);
        fetchProducts(1, filters);
    }, [cityId, filters, fetchProducts, invalidateCache]);

    return {
        products,
        isLoadingProducts: isLoading,
        productError: error,
        
        // Pagination
        loadMoreProducts,
        hasMorePages: currentPage < totalPages,
        isLoadingMore,
        
        // Filters
        currentFilters: filters,
        handleFiltersChange,
        
        // Refresh
        refreshProducts,
    };
};