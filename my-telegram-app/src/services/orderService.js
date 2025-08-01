import { apiClient } from '../api/apiClient';

export const orderService = {
    getUserOrders: () => {
        return apiClient('orders');
    },
    createOrderFromCart: (orderData) => {
        return apiClient('orders/from-cart', { 
            method: 'POST',
            body: orderData
        });
    },
    // --- ADD THIS NEW FUNCTION ---
    updateOrderStatus: (orderId, status) => {
        return apiClient(`orders/${orderId}/status`, {
            method: 'PUT',
            body: { status },
        });
    },
};