export interface Product {
  id: number
  name: string
  standardized_name_input: string
  description: string | null
  price: number
  discount_price: number | null
  category: string
  image_url: string | null
  is_on_sale: boolean
  stock_level: number
  supplier_id: number
  supplier_name?: string
  supplier_location?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateProductData {
  name: string
  standardized_name_input: string
  description?: string
  price: number
  discount_price?: number
  category: string
  image_url?: string
  is_on_sale: boolean
  stock_level: number
  supplier_id: number
}

export interface UpdateProductData {
  name?: string
  standardized_name_input?: string
  description?: string
  price?: number
  discount_price?: number
  category?: string
  image_url?: string
  is_on_sale?: boolean
  stock_level?: number
}

export interface GetProductsParams {
  page?: number
  limit?: number
  cityId?: string
  category?: string
  searchTerm?: string
}