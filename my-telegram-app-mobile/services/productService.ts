import { apiClient } from "../api/apiClient"
import type { Product, Deal, Supplier, FeaturedItem, ApiListResponse } from "../types"

interface RawItem {
  id?: string;
  image_url?: string;
  imageUrl?: string;
}

const normalizeImageUrl = <T extends RawItem>(item: T): T | null => {
  if (!item) return null;
  const imageUrl = item.image_url || item.imageUrl || null
  return {
    ...item,
    image_url: imageUrl,
    imageUrl: imageUrl,
  };
};

interface RawDeal extends RawItem {
  discountPercentage?: number | string;
  discount_percentage?: number | string;
  endDate?: string;
  end_date?: string;
  daysRemaining?: number;
  days_remaining?: number;
}

const normalizeDeal = (deal: RawDeal): Deal | null => {
  if (!deal) return null

  const normalized = normalizeImageUrl(deal)
  if (!normalized) return null

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
  } as unknown as Deal
}

interface RawSupplier extends RawItem {
  logo_url?: string;
  logoUrl?: string;
  logo?: string;
  city?: string;
  location?: string;
}

const normalizeSupplier = (supplier: RawSupplier): Supplier | null => {
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
  } as unknown as Supplier
}

interface ProductSearchParams {
  searchQuery?: string;
  searchTerm?: string;
  category?: string;
  cityId?: string;
  page?: string;
  limit?: string;
  [key: string]: string | undefined;
}

export const productService = {
  getProducts: (params: ProductSearchParams, options: RequestInit = {}) => {
    const normalizedParams: ProductSearchParams = { ...(params || {}) }

    // Backend contract uses `searchTerm` for product search.
    if (normalizedParams.searchQuery && !normalizedParams.searchTerm) {
      normalizedParams.searchTerm = normalizedParams.searchQuery
      delete normalizedParams.searchQuery
    }

    const filteredParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(normalizedParams)) {
      if (value !== undefined) {
        filteredParams[key] = value
      }
    }

    const query = new URLSearchParams(filteredParams).toString()
    return apiClient<Product[]>(`products?${query}`, options)
  },

  getProduct: (productId: string) => {
    return apiClient<Product>(`products/${productId}`)
  },

  getFavoriteProductDetails: (productId: string) => {
    return apiClient<Product>(`products/favorite-details/${productId}`)
  },

  getProductDetailsWithAlternatives: (productId: string) => {
    return apiClient<Product>(`products/favorite-details/${productId}`)
  },

  getRelatedProducts: async (productId: string, limit: number = 6) => {
    const params = new URLSearchParams({ limit: String(limit) })
    const response = await apiClient<ApiListResponse<Product> | Product[]>(`products/${productId}/related?${params.toString()}`)

    if (Array.isArray(response)) {
      return response.map((item) => normalizeImageUrl(item as RawItem & Product)).filter(Boolean) as Product[]
    }

    return ((response as ApiListResponse<Product>)?.items || []).map((item) => normalizeImageUrl(item as RawItem & Product)).filter(Boolean) as Product[]
  },

  getProductBatch: (idsString: string) => {
    const params = new URLSearchParams({ ids: idsString })
    return apiClient<Product[]>(`products/batch?${params.toString()}`)
  },

  getProductCategories: (cityId: string) => {
    return apiClient<string[]>(`products/categories?cityId=${cityId}`)
  },

  getFeaturedItems: async () => {
    const response = await apiClient<FeaturedItem[] | ApiListResponse<FeaturedItem>>("featured-items")
    const items = Array.isArray(response) ? response : (response as ApiListResponse<FeaturedItem>)?.items || []
    return items.map((item) => normalizeImageUrl(item as RawItem & FeaturedItem)).filter(Boolean) as FeaturedItem[]
  },

  getDeals: async (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    const response = await apiClient<RawDeal[] | ApiListResponse<RawDeal>>(`deals${query}`)
    const deals = Array.isArray(response) ? response : (response as ApiListResponse<RawDeal>)?.items || []
    return deals.map((d) => normalizeDeal(d)).filter(Boolean) as Deal[]
  },

  getSuppliers: async (cityId: string | null) => {
    const query = cityId ? `?cityId=${cityId}` : ""
    const response = await apiClient<RawSupplier[] | ApiListResponse<RawSupplier>>(`suppliers${query}`)
    const suppliers = Array.isArray(response) ? response : (response as ApiListResponse<RawSupplier>)?.items || []
    return suppliers.map((s) => normalizeSupplier(s)).filter(Boolean) as Supplier[]
  },
}
