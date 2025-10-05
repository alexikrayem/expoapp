import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { productService } from '../services/productService';
import { useCache } from '../context/CacheContext';
import { PAGINATION } from '../utils/constants';

export const useProducts = (cityId, externalFilters = {}) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Use external filters passed from parent component. Memoize for stability.
    const effectiveFilters = useMemo(() => ({
        category: externalFilters.category || 'all',
        minPrice: externalFilters.minPrice || '',
        maxPrice: externalFilters.maxPrice || '',
        onSale: externalFilters.onSale || false,
        supplier: externalFilters.supplier || '',
        searchQuery: externalFilters.searchQuery || '',
    }), [externalFilters]); // Re-evaluates only when the externalFilters object reference changes

    const { cachedApiCall, invalidateCache } = useCache();

    // useRef to keep track of the last successfully applied filters for cache invalidation logic
    const lastAppliedFiltersRef = useRef(null);

    const fetchProducts = useCallback(async (pageToFetch, appliedFilters) => {
        if (!cityId) {
            setProducts([]);
            setIsLoading(false);
            setError("No city selected."); // Add an error message for clarity
            return;
        }

        // Generate a stable key for the current set of filters (for cache and comparison)
        const filtersKey = JSON.stringify(appliedFilters);
        const cacheKey = `products_${cityId}_${pageToFetch}_${filtersKey}`;

        // Set loading states
        if (pageToFetch === 1) {
            setIsLoading(true);
            setProducts([]); // Clear products immediately on new main fetch to show skeleton
        } else {
            setIsLoadingMore(true);
        }
        setError(null); // Clear previous errors

        try {
            const params = {
                page: pageToFetch,
                limit: PAGINATION.PRODUCTS_PER_PAGE,
                cityId,
                ...appliedFilters,
            };

            // Clean up empty filter values before sending to API
            Object.keys(params).forEach(key => {
                // Keep 'onSale: false' as a parameter if you want to explicitly filter non-sale items.
                // If 'onSale: false' means 'ignore the filter', then delete it.
                // Assuming 'false' means 'don't filter by sale', but 'true' means 'only sale'.
                // If it should only be sent if true, change 'false' to !params[key].
                if (params[key] === '' || params[key] === 'all' || (key === 'onSale' && params[key] === false)) {
                    delete params[key];
                }
            });

            // Use cached API call
            const data = await cachedApiCall(
                cacheKey,
                () => productService.getProducts(params),
                3 * 60 * 1000 // 3 minutes cache for products
            );
            
            // --- CRITICAL FIX START ---
            // Ensure data is an object and has an 'items' array
            // If data is null/undefined, or items is not an array, default to empty array
            const fetchedItems = Array.isArray(data?.items) ? data.items : [];
            const newCurrentPage = data?.currentPage || 1; // Default to 1 if missing
            const newTotalPages = data?.totalPages || 1;   // Default to 1 if missing

            if (pageToFetch === 1) {
                setProducts(fetchedItems);
            } else {
                setProducts(prev => [...prev, ...fetchedItems]);
            }

            setCurrentPage(newCurrentPage);
            setTotalPages(newTotalPages);
            lastAppliedFiltersRef.current = appliedFilters; // Update the ref with filters that caused a successful fetch
            // --- CRITICAL FIX END ---

        } catch (err) {
            console.error("Error fetching products:", err);
            // Provide a more user-friendly error message if available, otherwise a generic one.
            setError(err.message || "Failed to load products. Please try again.");
            if (pageToFetch === 1) {
                setProducts([]); // Clear products on error for initial fetch
                setCurrentPage(1); // Reset pagination on error for initial fetch
                setTotalPages(1);
            }
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [cityId, cachedApiCall]);

    // This useEffect is the single source of truth for triggering product fetches based on filters.
    useEffect(() => {
        // Only invalidate the cache if the filters have actually changed from the last fetch
        // (to avoid invalidating on component remounts with same filters)
        // or if lastAppliedFiltersRef.current is null (initial load) AND effectiveFilters is not default
        // A simpler approach is to always invalidate product cache for the *current city* when filters change
        // to ensure any subsequent fetches (like loadMore) get fresh data.
        if (JSON.stringify(lastAppliedFiltersRef.current) !== JSON.stringify(effectiveFilters)) {
            invalidateCache(`products_${cityId}`); 
        }
        setCurrentPage(1); // Always reset to page 1 for new filter sets or city changes
        fetchProducts(1, effectiveFilters); // Fetch with the latest effective filters
    }, [cityId, effectiveFilters, fetchProducts, invalidateCache]); // Dependencies ensure reactivity

    const loadMoreProducts = () => {
        if (isLoadingMore || currentPage >= totalPages || isLoading) return; // Prevent loading more if initial data is still loading
        const nextPage = currentPage + 1;
        fetchProducts(nextPage, effectiveFilters); // Use the current effective filters for loading more
    };

    const refreshProducts = useCallback(() => {
        // Invalidate cache for current city products and re-fetch page 1
        invalidateCache(`products_${cityId}`);
        setCurrentPage(1);
        fetchProducts(1, effectiveFilters);
    }, [cityId, effectiveFilters, fetchProducts, invalidateCache]);

    return {
        products,
        isLoadingProducts: isLoading,
        productError: error,
        
        loadMoreProducts,
        hasMorePages: currentPage < totalPages,
        isLoadingMore,
        
        refreshProducts,
    };
};