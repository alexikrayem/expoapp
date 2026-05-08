import { apiClient } from '../api/apiClient';
import type { CreateOrderPayload, Order } from '../types';

const buildIdempotencyKey = () =>
    `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const orderService = {
    getUserOrders: () => {
        return apiClient<Order[]>('orders');
    },
    createOrderFromCart: (orderData: CreateOrderPayload) => {
        const idempotencyKey = buildIdempotencyKey();
        return apiClient<Order>('orders/from-cart', {
            method: 'POST',
            headers: {
                'Idempotency-Key': idempotencyKey,
            },
            body: orderData
        });
    },
    updateOrderStatus: (orderId: string, status: string) => {
        return apiClient<Order>(`orders/${orderId}/status`, {
            method: 'PUT',
            body: { status },
        });
    },
};
