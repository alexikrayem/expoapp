// src/hooks/useProducts.js
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
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

    const fetchProducts = useCallback(async (pageToFetch, appliedFilters) => {
        if (!cityId) return;

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

            const data = await productService.getProducts(params);
            
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
    }, [cityId]);

    // Effect to refetch products when cityId or filters change
    useEffect(() => {
        // Reset and fetch from page 1 whenever filters or city changes
        setCurrentPage(1); 
        fetchProducts(1, filters);
    }, [cityId, filters, fetchProducts]);

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
        // The useEffect above will handle the refetching.
    };
    
    const loadMoreProducts = () => {
        if (isLoadingMore || currentPage >= totalPages) return;
        const nextPage = currentPage + 1;
        fetchProducts(nextPage, filters);
    };

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
    };
};