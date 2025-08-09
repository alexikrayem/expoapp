// src/hooks/useSupplierData.js - Custom hook for supplier data management
import { useState, useEffect, useCallback } from 'react';
import { supplierService } from '../services/supplierService';

export const useSupplierData = () => {
    const [supplierProfile, setSupplierProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            const profile = await supplierService.getProfile();
            setSupplierProfile(profile);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch supplier profile:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return {
        supplierProfile,
        isLoading,
        error,
        refetchProfile: fetchProfile,
    };
};

export const useSupplierProducts = (filters = {}) => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
    });

    const fetchProducts = useCallback(async (page = 1) => {
        try {
            setIsLoading(true);
            const params = { ...filters, page, limit: 20 };
            const response = await supplierService.getProducts(params);
            
            if (page === 1) {
                setProducts(response.data || response);
            } else {
                setProducts(prev => [...prev, ...(response.data || response)]);
            }
            
            setPagination({
                currentPage: response.currentPage || page,
                totalPages: response.totalPages || 1,
                totalItems: response.totalItems || (response.data || response).length,
            });
            setError(null);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError(err.message);
            if (page === 1) setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchProducts(1);
    }, [fetchProducts]);

    const loadMore = () => {
        if (pagination.currentPage < pagination.totalPages) {
            fetchProducts(pagination.currentPage + 1);
        }
    };

    return {
        products,
        isLoading,
        error,
        pagination,
        loadMore,
        refetchProducts: () => fetchProducts(1),
    };
};

export const useSupplierOrders = (filters = {}) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await supplierService.getOrders(filters);

            const safeOrders = Array.isArray(response?.items)
                ? response.items
                : Array.isArray(response?.data)
                    ? response.data
                    : Array.isArray(response)
                        ? response
                        : [];

            setOrders(safeOrders);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            setError(err.message);
            setOrders([]); // ensure array
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return {
        orders,
        isLoading,
        error,
        refetchOrders: fetchOrders,
    };
};
