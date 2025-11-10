// src/hooks/useOrders.js (JWT-AUTHENTICATED VERSION)
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';
import { emitter } from '../utils/emitter'; // Make sure you have created this file

export const useOrders = (telegramUser) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = useCallback(async () => {
        // Check if user is authenticated using JWT tokens instead of telegramUser
        if (!authService.isAuthenticated()) {
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
    }, []);

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