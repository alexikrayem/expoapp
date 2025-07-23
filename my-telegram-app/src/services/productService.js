import { apiClient } from '../api/apiClient';

export const productService = {
    getProducts: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiClient(`products?${query}`);
    },
    
    getProduct: (productId) => {
        return apiClient(`products/${productId}`);
    },
    
    // This is a special endpoint for favorites that might need to join user data
    getFavoriteProductDetails: (productId) => {
        return apiClient(`products/${productId}/favorite-details`);
    },
    
    getProductBatch: (idsString) => {
        const params = new URLSearchParams({ ids: idsString });
        return apiClient(`products/batch?${params.toString()}`);
    },
    
    getProductCategories: (cityId) => {
        return apiClient(`products/categories?cityId=${cityId}`);
    },
    
    getFeaturedItems: () => {
        return apiClient('featured-items');
    }
};
