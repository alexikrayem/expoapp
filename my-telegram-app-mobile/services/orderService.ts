import { apiClient } from '../api/apiClient';

const buildIdempotencyKey = () =>
    `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export const orderService = {
    getUserOrders: () => {
        return apiClient('orders');
    },
    createOrderFromCart: (orderData: any) => {
        const idempotencyKey = buildIdempotencyKey();
        return apiClient('orders/from-cart', {
            method: 'POST',
            headers: {
                'Idempotency-Key': idempotencyKey,
            },
            body: orderData
        });
    },
    updateOrderStatus: (orderId: string, status: string) => {
        return apiClient(`orders/${orderId}/status`, {
            method: 'PUT',
            body: { status },
        });
    },
};
