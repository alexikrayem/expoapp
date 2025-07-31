// src/hooks/useOrders.js (DEFINITIVE FINAL VERSION)
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter'; // Make sure you have created this file

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
        fetchOrders(); // Initial fetch
        const onOrderPlaced = () => fetchOrders(); // Define listener
        emitter.on('order-placed', onOrderPlaced); // Subscribe
        return () => {
            emitter.off('order-placed', onOrderPlaced); // Unsubscribe on cleanup
        };
    }, [fetchOrders]);
    
    const refetchOrders = () => fetchOrders();

    return { orders, isLoadingOrders: isLoading, ordersError: error, refetchOrders };
};