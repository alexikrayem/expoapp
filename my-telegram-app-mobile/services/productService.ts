import { apiClient } from "../api/apiClient"

const normalizeImageUrl = (item: any) => ({
  ...item,
  imageUrl: item.imageUrl || item.image_url || null,
})

export const productService = {
  getProducts: (params: any) => {
    const query = new URLSearchParams(params).toString()
    return apiClient(`products?${query}`)
  },

  getProduct: (productId: string) => {
    return apiClient(`products/${productId}`)
  },

  getFavoriteProductDetails: (productId: string) => {
    return apiClient(`products/${productId}/favorite-details`)
  },

  getProductDetailsWithAlternatives: (productId: string) => {
    return apiClient(`products/favorite-details/${productId}`)
  },

  getRelatedProducts: (masterProductId: string, currentProductId: string) => {
    return apiClient(`products/related/${masterProductId}?exclude=${currentProductId}`)
  },

  getProductBatch: (idsString: string) => {
    const params = new URLSearchParams({ ids: idsString })
    return apiClient(`products/batch?${params.toString()}`)
  },

  getProductCategories: (cityId: string) => {
    return apiClient(`products/categories?cityId=${cityId}`)
  },

  getFeaturedItems: async () => {
    const items = await apiClient("featured-items")
    return items.map(normalizeImageUrl)
  },

  getDeals: async (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    const deals = await apiClient(`deals${query}`)
    return deals.map(normalizeImageUrl)
  },

  getSuppliers: (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    return apiClient(`suppliers${query}`)
  },
}
