// src/hooks/useSuppliers.js
import { useState, useEffect, useCallback } from 'react';
import { cityService } from '../services/cityService';

export const useSuppliers = (cityId) => {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSuppliers = useCallback(async () => {
        if (!cityId) {
            setSuppliers([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await cityService.getSuppliers(cityId);
            setSuppliers(data || []);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [cityId]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    return { suppliers, isLoadingSuppliers: isLoading, supplierError: error };
};