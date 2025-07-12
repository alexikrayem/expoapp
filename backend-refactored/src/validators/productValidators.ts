import { z } from 'zod'

export const GetProductsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 12),
  cityId: z.string().optional(),
  category: z.string().optional(),
  searchTerm: z.string().optional(),
})

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  standardized_name_input: z.string().min(1, 'Standardized name is required').max(255),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  discount_price: z.number().positive().optional(),
  category: z.string().min(1, 'Category is required').max(100),
  image_url: z.string().url().optional().or(z.literal('')),
  is_on_sale: z.boolean().default(false),
  stock_level: z.number().int().min(0, 'Stock level cannot be negative'),
}).refine(data => {
  if (data.discount_price && data.discount_price >= data.price) {
    return false
  }
  return true
}, {
  message: 'Discount price must be less than regular price',
  path: ['discount_price']
})

export const UpdateProductSchema = CreateProductSchema.partial()