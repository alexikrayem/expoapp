import { apiClient } from "../api/apiClient"

export const productService = {
  getProducts: (params) => {
    const query = new URLSearchParams(params).toString()
    return apiClient(`products?${query}`)
  },

  getProduct: (productId) => {
    return apiClient(`products/${productId}`)
  },

  // This is a special endpoint for favorites that might need to join user data
  getFavoriteProductDetails: (productId) => {
    return apiClient(`products/${productId}/favorite-details`)
  },
  // NEW PRIMARY FUNCTION for getting all details for the modal
  getProductDetailsWithAlternatives: (productId) => {
    // This hits the smart backend route we built
    return apiClient(`products/favorite-details/${productId}`)
  },

  getRelatedProducts: (masterProductId, currentProductId) => {
    return apiClient(`products/related/${masterProductId}?exclude=${currentProductId}`)
  },

  getProductBatch: (idsString) => {
    const params = new URLSearchParams({ ids: idsString })
    return apiClient(`products/batch?${params.toString()}`)
  },

  getProductCategories: (cityId) => {
    return apiClient(`products/categories?cityId=${cityId}`)
  },

  getFeaturedItems: () => {
    return apiClient("featured-items")
  },
}
