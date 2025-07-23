import { apiClient } from '../api/apiClient';

export const orderService = {
    getUserOrders: () => {
        return apiClient('orders');
    },

    createOrder: () => {
        // No body is needed; the backend will use the user's validated cart.
        return apiClient('orders', {
            method: 'POST',
        });
    },
};
