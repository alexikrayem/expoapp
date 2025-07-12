import { ApiClient, Product, PaginationInfo } from '../client'
import { z } from 'zod'

const ProductsResponseSchema = z.object({
  items: z.array(Product),
  ...PaginationInfo.shape,
})

export class ProductService {
  constructor(private client: ApiClient) {}

  async getProducts(params: {
    page?: number
    limit?: number
    cityId?: string
    category?: string
    searchTerm?: string
  } = {}): Promise<z.infer<typeof ProductsResponseSchema>> {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.cityId) searchParams.set('cityId', params.cityId)
    if (params.category) searchParams.set('category', params.category)
    if (params.searchTerm) searchParams.set('searchTerm', params.searchTerm)

    const response = await this.client.get<any>(`/api/products?${searchParams}`)
    return ProductsResponseSchema.parse(response)
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.client.get<any>(`/api/products/${id}`)
    return Product.parse(response)
  }

  async createProduct(data: Omit<Product, 'id' | 'supplier_id'>): Promise<Product> {
    const response = await this.client.post<any>('/api/supplier/products', data)
    return Product.parse(response)
  }

  async updateProduct(id: number, data: Partial<Omit<Product, 'id' | 'supplier_id'>>): Promise<Product> {
    const response = await this.client.put<any>(`/api/supplier/products/${id}`, data)
    return Product.parse(response)
  }

  async deleteProduct(id: number): Promise<void> {
    await this.client.delete(`/api/supplier/products/${id}`)
  }
}