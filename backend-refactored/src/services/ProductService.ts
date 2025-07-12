import { ProductRepository } from '../repositories/ProductRepository'
import { Product, CreateProductData, UpdateProductData, GetProductsParams } from '../types/Product'
import { NotFoundError, UnauthorizedError } from '../utils/errors'

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  async getProducts(params: GetProductsParams) {
    const { page = 1, limit = 12, cityId, category, searchTerm } = params
    
    const offset = (page - 1) * limit
    
    const result = await this.productRepository.findMany({
      offset,
      limit,
      cityId,
      category,
      searchTerm
    })
    
    const totalItems = await this.productRepository.count({
      cityId,
      category,
      searchTerm
    })
    
    return {
      items: result,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    return this.productRepository.findById(id)
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    // Business logic validation
    if (data.discount_price && data.discount_price >= data.price) {
      throw new Error('Discount price must be less than regular price')
    }
    
    return this.productRepository.create(data)
  }

  async updateProduct(id: number, data: UpdateProductData, supplierId?: number): Promise<Product> {
    const existingProduct = await this.productRepository.findById(id)
    
    if (!existingProduct) {
      throw new NotFoundError('Product not found')
    }
    
    // Check ownership if supplier is updating
    if (supplierId && existingProduct.supplier_id !== supplierId) {
      throw new UnauthorizedError('You can only update your own products')
    }
    
    // Business logic validation
    if (data.discount_price && data.price && data.discount_price >= data.price) {
      throw new Error('Discount price must be less than regular price')
    }
    
    return this.productRepository.update(id, data)
  }

  async deleteProduct(id: number, supplierId?: number): Promise<void> {
    const existingProduct = await this.productRepository.findById(id)
    
    if (!existingProduct) {
      throw new NotFoundError('Product not found')
    }
    
    // Check ownership if supplier is deleting
    if (supplierId && existingProduct.supplier_id !== supplierId) {
      throw new UnauthorizedError('You can only delete your own products')
    }
    
    await this.productRepository.delete(id)
  }

  async getProductsBySupplier(supplierId: number, params: GetProductsParams) {
    const { page = 1, limit = 12 } = params
    const offset = (page - 1) * limit
    
    const result = await this.productRepository.findBySupplier(supplierId, {
      offset,
      limit
    })
    
    const totalItems = await this.productRepository.countBySupplier(supplierId)
    
    return {
      items: result,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit
    }
  }
}