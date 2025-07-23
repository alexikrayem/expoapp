// src/hooks/useFavoriteProducts.js
import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';

export const useFavoriteProducts = (favoriteIds, active) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProducts = useCallback(async () => {
        if (!active || favoriteIds.size === 0) {
            setProducts([]);
            setIsLoading(false); // Ensure loading is false if we don't fetch
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const idsString = Array.from(favoriteIds).join(',');
            const data = await productService.getProductBatch(idsString);
            setProducts(data || []);
        } catch (err) {
            console.error("Failed to fetch favorite products:", err);
            setError(err.message);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [active, favoriteIds]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return { favoriteProducts: products, isLoadingFavoritesTab: isLoading, favoritesTabError: error };
};