import { apiClient } from '../api/apiClient';

export const cartService = {
    getCart: () => {
        return apiClient('api/cart');
    },

    addToCart: (productId, quantity) => {
        return apiClient('api/cart/items', {
            method: 'POST',
            body: { productId, quantity },
        });
    },

    updateCartItem: (productId, quantity) => {
        return apiClient(`api/cart/items/${productId}`, {
            method: 'PUT',
            body: { quantity },
        });
    },

    removeCartItem: (productId) => {
        return apiClient(`api/cart/items/${productId}`, {
            method: 'DELETE',
        });
    },
};
