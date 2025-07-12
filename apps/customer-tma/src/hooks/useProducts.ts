import { useApi } from '@medical-expo/utils'
import { productService } from '../services/api'

export interface UseProductsParams {
  page?: number
  limit?: number
  cityId?: string
  category?: string
  searchTerm?: string
}

export const useProducts = (params: UseProductsParams = {}) => {
  return useApi(
    () => productService.getProducts(params),
    {
      immediate: !!params.cityId, // Only fetch if cityId is provided
    }
  )
}

export const useProduct = (id: number) => {
  return useApi(
    () => productService.getProduct(id),
    {
      immediate: !!id,
    }
  )
}