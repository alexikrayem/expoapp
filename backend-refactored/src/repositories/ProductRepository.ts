import { Pool } from 'pg'
import { Product, CreateProductData, UpdateProductData } from '../types/Product'

export interface FindManyOptions {
  offset: number
  limit: number
  cityId?: string
  category?: string
  searchTerm?: string
}

export interface CountOptions {
  cityId?: string
  category?: string
  searchTerm?: string
}

export class ProductRepository {
  constructor(private db: Pool) {}

  async findMany(options: FindManyOptions): Promise<Product[]> {
    const { offset, limit, cityId, category, searchTerm } = options
    
    let query = `
      SELECT p.*, s.name as supplier_name, s.location as supplier_location
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.is_active = true AND s.is_active = true
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    if (cityId) {
      query += ` AND s.city_id = $${paramIndex}`
      params.push(cityId)
      paramIndex++
    }
    
    if (category) {
      query += ` AND p.category ILIKE $${paramIndex}`
      params.push(`%${category}%`)
      paramIndex++
    }
    
    if (searchTerm) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
      params.push(`%${searchTerm}%`)
      paramIndex++
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)
    
    const result = await this.db.query(query, params)
    return result.rows
  }

  async count(options: CountOptions): Promise<number> {
    const { cityId, category, searchTerm } = options
    
    let query = `
      SELECT COUNT(*)
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.is_active = true AND s.is_active = true
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    if (cityId) {
      query += ` AND s.city_id = $${paramIndex}`
      params.push(cityId)
      paramIndex++
    }
    
    if (category) {
      query += ` AND p.category ILIKE $${paramIndex}`
      params.push(`%${category}%`)
      paramIndex++
    }
    
    if (searchTerm) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
      params.push(`%${searchTerm}%`)
      paramIndex++
    }
    
    const result = await this.db.query(query, params)
    return parseInt(result.rows[0].count)
  }

  async findById(id: number): Promise<Product | null> {
    const query = `
      SELECT p.*, s.name as supplier_name, s.location as supplier_location
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = $1
    `
    
    const result = await this.db.query(query, [id])
    return result.rows[0] || null
  }

  async create(data: CreateProductData): Promise<Product> {
    const query = `
      INSERT INTO products (
        name, standardized_name_input, description, price, discount_price,
        category, image_url, is_on_sale, stock_level, supplier_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `
    
    const values = [
      data.name,
      data.standardized_name_input,
      data.description,
      data.price,
      data.discount_price,
      data.category,
      data.image_url,
      data.is_on_sale,
      data.stock_level,
      data.supplier_id
    ]
    
    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  async update(id: number, data: UpdateProductData): Promise<Product> {
    const fields = []
    const values = []
    let paramIndex = 1
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    })
    
    if (fields.length === 0) {
      throw new Error('No fields to update')
    }
    
    const query = `
      UPDATE products 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    values.push(id)
    
    const result = await this.db.query(query, values)
    return result.rows[0]
  }

  async delete(id: number): Promise<void> {
    await this.db.query('DELETE FROM products WHERE id = $1', [id])
  }

  async findBySupplier(supplierId: number, options: { offset: number; limit: number }): Promise<Product[]> {
    const query = `
      SELECT p.*, s.name as supplier_name
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.supplier_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `
    
    const result = await this.db.query(query, [supplierId, options.limit, options.offset])
    return result.rows
  }

  async countBySupplier(supplierId: number): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) FROM products WHERE supplier_id = $1',
      [supplierId]
    )
    return parseInt(result.rows[0].count)
  }
}