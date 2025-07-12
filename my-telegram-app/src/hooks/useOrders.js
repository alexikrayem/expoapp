// src/hooks/useOrders.js
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';

export const useOrders = (telegramUser) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = useCallback(async () => {
        if (!telegramUser?.id) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await orderService.getUserOrders();
            setOrders(data || []);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [telegramUser?.id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    // We can add a function to manually refetch orders after a new one is placed
    const refetchOrders = () => {
        fetchOrders();
    };

    return { orders, isLoadingOrders: isLoading, ordersError: error, refetchOrders };
};