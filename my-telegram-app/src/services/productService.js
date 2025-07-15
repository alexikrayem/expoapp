import { apiClient } from '../api/apiClient';

export const productService = {
    getProducts: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiClient(`api/products?${query}`);
    },
    
    getProduct: (productId) => {
        return apiClient(`api/products/${productId}`);
    },
    
    // This is a special endpoint for favorites that might need to join user data
    getFavoriteProductDetails: (productId) => {
        return apiClient(`api/products/${productId}/favorite-details`);
    },
    
    getProductBatch: (idsString) => {
        const params = new URLSearchParams({ ids: idsString });
        return apiClient(`api/products/batch?${params.toString()}`);
    },
    
    getProductCategories: (cityId) => {
        return apiClient(`api/products/categories?cityId=${cityId}`);
    },
    
    getFeaturedItems: () => {
        return apiClient('api/featured-items');
    }
};
