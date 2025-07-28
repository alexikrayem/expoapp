import { apiClient } from '../api/apiClient';

export const orderService = {
    getUserOrders: () => {
        return apiClient('orders');
    },
    createOrder: () => {
        return apiClient('orders', { method: 'POST' });
    },
    // --- ADD THIS NEW FUNCTION ---
    updateOrderStatus: (orderId, status) => {
        return apiClient(`orders/${orderId}/status`, {
            method: 'PUT',
            body: { status },
        });
    },
};