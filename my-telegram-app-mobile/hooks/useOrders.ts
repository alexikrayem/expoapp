import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';
import { emitter } from '../utils/emitter';
import { useEffect } from 'react';

/**
 * Fetches the authenticated user's orders.
 * @param userId — The current user's ID. Pass `null`/`undefined` to disable the query.
 */
export const useOrders = (userId: string | number | null | undefined) => {
    const queryClient = useQueryClient();

    const { data: orders, isLoading: isLoadingOrders, error: ordersError, refetch } = useQuery({
        queryKey: ['orders', userId],
        queryFn: async () => {
            const isAuth = await authService.isAuthenticated();
            if (!isAuth) return [];
            return orderService.getUserOrders();
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        const onOrderPlaced = () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        };
        emitter.on('order-placed', onOrderPlaced);
        return () => {
            emitter.off('order-placed', onOrderPlaced);
        };
    }, [queryClient]);

    return {
        orders: orders || [],
        isLoadingOrders,
        ordersError: ordersError ? (ordersError as Error).message : null,
        refetchOrders: refetch
    };
};
