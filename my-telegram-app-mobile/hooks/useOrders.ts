import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';
import { emitter } from '../utils/emitter';
import { useEffect } from 'react';

export const useOrders = (telegramUser: any) => {
    const queryClient = useQueryClient();

    const { data: orders, isLoading: isLoadingOrders, error: ordersError, refetch } = useQuery({
        queryKey: ['orders', telegramUser?.id],
        queryFn: async () => {
            const isAuth = await authService.isAuthenticated();
            if (!isAuth) return [];
            return orderService.getUserOrders();
        },
        enabled: !!telegramUser,
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
