// src/hooks/useDeals.js
import { useState, useEffect, useCallback } from 'react';
import { cityService } from '../services/cityService';

export const useDeals = (cityId) => {
    const [deals, setDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDeals = useCallback(async () => {
        if (!cityId) {
            setDeals([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await cityService.getDeals(cityId);
            setDeals(data || []);
        } catch (err) {
            console.error("Failed to fetch deals:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [cityId]);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    return { deals, isLoadingDeals: isLoading, dealError: error };
};