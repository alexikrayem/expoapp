import { Request, Response } from 'express'
import { ProductService } from '../services/ProductService'
import { validateRequest } from '../middleware/validation'
import { GetProductsSchema, CreateProductSchema, UpdateProductSchema } from '../validators/productValidators'

export class ProductController {
  constructor(private productService: ProductService) {}

  getProducts = async (req: Request, res: Response) => {
    try {
      const params = validateRequest(GetProductsSchema, req.query)
      const result = await this.productService.getProducts(params)
      res.json(result)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  getProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' })
      }
      
      const product = await this.productService.getProductById(id)
      if (!product) {
        return res.status(404).json({ error: 'Product not found' })
      }
      
      res.json(product)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  createProduct = async (req: Request, res: Response) => {
    try {
      const data = validateRequest(CreateProductSchema, req.body)
      const supplierId = req.supplier?.supplierId
      
      if (!supplierId) {
        return res.status(401).json({ error: 'Supplier authentication required' })
      }
      
      const product = await this.productService.createProduct({
        ...data,
        supplier_id: supplierId
      })
      
      res.status(201).json(product)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  updateProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id)
      const data = validateRequest(UpdateProductSchema, req.body)
      const supplierId = req.supplier?.supplierId
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' })
      }
      
      const product = await this.productService.updateProduct(id, data, supplierId)
      res.json(product)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  deleteProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id)
      const supplierId = req.supplier?.supplierId
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' })
      }
      
      await this.productService.deleteProduct(id, supplierId)
      res.status(204).send()
    } catch (error) {
      this.handleError(error, res)
    }
  }

  private handleError(error: any, res: Response) {
    console.error('Product controller error:', error)
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message })
    }
    
    if (error.name === 'UnauthorizedError') {
      return res.status(403).json({ error: error.message })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
}