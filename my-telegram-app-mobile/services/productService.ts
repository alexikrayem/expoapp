import { apiClient } from "../api/apiClient"

const normalizeImageUrl = (item: any) => {
  if (!item) return null;
  const imageUrl = item.image_url || item.imageUrl || null
  return {
    ...item,
    image_url: imageUrl,
    imageUrl: imageUrl,
  };
};

const normalizeDeal = (deal: any) => {
  if (!deal) return null

  const normalized = normalizeImageUrl(deal)
  const discountRaw = normalized.discountPercentage ?? normalized.discount_percentage
  const numericDiscount =
    discountRaw === undefined || discountRaw === null || Number.isNaN(Number(discountRaw))
      ? null
      : Number(discountRaw)

  const endDateValue = normalized.endDate || normalized.end_date
  let daysRemaining = normalized.daysRemaining ?? normalized.days_remaining
  if ((daysRemaining === undefined || daysRemaining === null) && endDateValue) {
    const endTimestamp = new Date(endDateValue).getTime()
    if (Number.isFinite(endTimestamp)) {
      const dayMs = 24 * 60 * 60 * 1000
      daysRemaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / dayMs))
    }
  }

  return {
    ...normalized,
    discount_percentage: numericDiscount ?? normalized.discount_percentage,
    discountPercentage: numericDiscount ?? undefined,
    daysRemaining: daysRemaining ?? 0,
  }
}

const normalizeSupplier = (supplier: any) => {
  if (!supplier) return null

  const logoUrl =
    supplier.logo_url || supplier.logoUrl || supplier.logo || supplier.image_url || supplier.imageUrl || null

  return {
    ...supplier,
    logo_url: logoUrl,
    logoUrl: logoUrl,
    logo: logoUrl,
    image_url: supplier.image_url || logoUrl,
    city: supplier.city || supplier.location || null,
  }
}

export const productService = {
  getProducts: (params: any, options: RequestInit = {}) => {
    const normalizedParams = { ...(params || {}) }

    // Backend contract uses `searchTerm` for product search.
    if (normalizedParams.searchQuery && !normalizedParams.searchTerm) {
      normalizedParams.searchTerm = normalizedParams.searchQuery
      delete normalizedParams.searchQuery
    }

    const query = new URLSearchParams(normalizedParams).toString()
    return apiClient(`products?${query}`, options)
  },

  getProduct: (productId: string) => {
    return apiClient(`products/${productId}`)
  },

  getFavoriteProductDetails: (productId: string) => {
    return apiClient(`products/favorite-details/${productId}`)
  },

  getProductDetailsWithAlternatives: (productId: string) => {
    return apiClient(`products/favorite-details/${productId}`)
  },

  getRelatedProducts: async (productId: string, limit: number = 6) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const response = await apiClient<{ items?: any[] } | any[]>(`products/${productId}/related?${params.toString()}`)

    if (Array.isArray(response)) {
      return response.map(normalizeImageUrl).filter(Boolean)
    }

    return (response?.items || []).map(normalizeImageUrl).filter(Boolean)
  },

  getProductBatch: (idsString: string) => {
    const params = new URLSearchParams({ ids: idsString })
    return apiClient(`products/batch?${params.toString()}`)
  },

  getProductCategories: (cityId: string) => {
    return apiClient(`products/categories?cityId=${cityId}`)
  },

  getFeaturedItems: async () => {
    const response = await apiClient("featured-items")
    const items = Array.isArray(response) ? response : (response as any)?.items || []
    return items.map(normalizeImageUrl).filter(Boolean)
  },

  getDeals: async (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    const response = await apiClient(`deals${query}`)
    const deals = Array.isArray(response) ? response : (response as any)?.items || []
    return deals.map(normalizeDeal).filter(Boolean)
  },

  getSuppliers: async (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    const response = await apiClient(`suppliers${query}`)
    const suppliers = Array.isArray(response) ? response : (response as any)?.items || []
    return suppliers.map(normalizeSupplier).filter(Boolean)
  },
}
