// src/hooks/useSupplierData.js - Enhanced with better error handling and caching
import { useState, useEffect, useCallback } from 'react';
import { supplierService } from '../services/supplierService';

export const useSupplierData = () => {
    const [supplierProfile, setSupplierProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const profile = await supplierService.getProfile();
            setSupplierProfile(profile);
        } catch (err) {
            console.error('Failed to fetch supplier profile:', err);
            setError(err.message || 'Failed to fetch profile');
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
            setError(null);
            const params = { ...filters, page, limit: 20 };
            const response = await supplierService.getProducts(params);
            
            const productsData = response.items || response.data || response || [];
            
            if (page === 1) {
                setProducts(productsData);
            } else {
                setProducts(prev => [...prev, ...productsData]);
            }
            
            setPagination({
                currentPage: response.currentPage || page,
                totalPages: response.totalPages || 1,
                totalItems: response.totalItems || productsData.length,
            });
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError(err.message || 'Failed to fetch products');
            if (page === 1) setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchProducts(1);
    }, [fetchProducts]);

    const loadMore = () => {
        if (pagination.currentPage < pagination.totalPages && !isLoading) {
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
            setError(null);
            const response = await supplierService.getOrders(filters);

            const safeOrders = response?.items || response?.data || response || [];
            setOrders(Array.isArray(safeOrders) ? safeOrders : []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            setError(err.message || 'Failed to fetch orders');
            setOrders([]);
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

export const useSupplierStats = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const statsData = await supplierService.getStats();
            setStats(statsData);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            setError(err.message || 'Failed to fetch statistics');
            // Set default stats to prevent UI errors
            setStats({
                total_products: 0,
                in_stock_products: 0,
                out_of_stock_products: 0,
                on_sale_products: 0,
                orders_this_month: 0,
                sales_this_month: 0
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        isLoading,
        error,
        refetchStats: fetchStats,
    };
};

export const useSupplierDeals = () => {
    const [deals, setDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDeals = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await supplierService.getDeals();
            const dealsData = response || [];
            setDeals(Array.isArray(dealsData) ? dealsData : []);
        } catch (err) {
            console.error('Failed to fetch deals:', err);
            setError(err.message || 'Failed to fetch deals');
            setDeals([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    return {
        deals,
        isLoading,
        error,
        refetchDeals: fetchDeals,
    };
};