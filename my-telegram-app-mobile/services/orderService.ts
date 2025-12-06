import { apiClient } from '../api/apiClient';

export const orderService = {
    getUserOrders: () => {
        return apiClient('orders');
    },
    createOrderFromCart: (orderData: any) => {
        return apiClient('orders/from-cart', {
            method: 'POST',
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
