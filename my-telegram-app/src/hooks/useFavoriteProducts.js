// src/hooks/useFavoriteProducts.js - Enhanced with caching
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import { useCache } from '../context/CacheContext';

export const useFavoriteProducts = (favoriteIds, active) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { cachedApiCall } = useCache();

    const fetchProducts = useCallback(async () => {
        if (!active || favoriteIds.size === 0) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        const idsArray = Array.from(favoriteIds);
        const cacheKey = `favorite_products_${idsArray.sort().join(',')}`;

        setIsLoading(true);
        setError(null);
        try {
            const idsString = idsArray.join(',');
            const data = await cachedApiCall(
                cacheKey,
                () => productService.getProductBatch(idsString),
                2 * 60 * 1000 // 2 minutes cache for favorites
            );
            setProducts(data || []);
        } catch (err) {
            console.error("Failed to fetch favorite products:", err);
            setError(err.message);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [active, favoriteIds, cachedApiCall]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return { 
        favoriteProducts: products, 
        isLoadingFavoritesTab: isLoading, 
        favoritesTabError: error 
    };
};