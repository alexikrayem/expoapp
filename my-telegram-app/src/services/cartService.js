// src/services/cartService.js
import { apiClient } from '../api/apiClient';

export const cartService = {
   
    getCart: () => {
        return apiClient('cart');
    },

   
    addToCart: (productId, quantity) => {
        return apiClient('cart/items', {
            method: 'POST',
            body: { productId, quantity },
        });
    },

   
    updateCartItem: (productId, quantity) => {
        return apiClient(`cart/items/${productId}`, {
            method: 'PUT',
            body: { quantity },
        });
    },

    
    removeCartItem: (productId) => {
        return apiClient(`cart/items/${productId}`, {
            method: 'DELETE',
        });
    },
};