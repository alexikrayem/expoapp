import { apiClient } from './apiClient';

export const productService = {
  getProducts: (params: any) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`products?${query}`);
  },

  getProduct: (productId: string) => {
    return apiClient.get(`products/${productId}`);
  },

  // This is a special endpoint for favorites that might need to join user data
  getFavoriteProductDetails: (productId: string) => {
    return apiClient.get(`products/${productId}/favorite-details`);
  },

  // NEW PRIMARY FUNCTION for getting all details for the modal
  getProductDetailsWithAlternatives: (productId: string) => {
    // This hits the smart backend route we built
    return apiClient.get(`products/favorite-details/${productId}`);
  },

  getRelatedProducts: (masterProductId: string, currentProductId: string) => {
    return apiClient.get(`products/related/${masterProductId}?exclude=${currentProductId}`);
  },

  getProductBatch: (idsString: string) => {
    const params = new URLSearchParams({ ids: idsString });
    return apiClient.get(`products/batch?${params.toString()}`);
  },

  getProductCategories: (cityId: string) => {
    return apiClient.get(`products/categories?cityId=${cityId}`);
  },

  getFeaturedItems: () => {
    return apiClient.get("featured-items");
  },

  getFeaturedProducts: (cityId: string) => {
    return apiClient.get(`products/featured?cityId=${cityId}`);
  },
};