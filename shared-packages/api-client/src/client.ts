import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { z } from 'zod'

export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  tokenKey?: string
  onUnauthorized?: () => void
}

export class ApiClient {
  private client: AxiosInstance
  private tokenKey: string

  constructor(config: ApiClientConfig) {
    this.tokenKey = config.tokenKey || 'authToken'
    
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
    })

    this.setupInterceptors(config.onUnauthorized)
  }

  private setupInterceptors(onUnauthorized?: () => void) {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken()
          onUnauthorized?.()
        }
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      return new ApiError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        error.response?.data?.code
      )
    }
    return new ApiError('An unexpected error occurred', 500)
  }

  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  private clearToken(): void {
    localStorage.removeItem(this.tokenKey)
  }

  public setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Validation schemas
export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  totalPages: z.number(),
  totalItems: z.number(),
})

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  discount_price: z.number().nullable(),
  category: z.string(),
  image_url: z.string().nullable(),
  is_on_sale: z.boolean(),
  stock_level: z.number(),
  supplier_id: z.number(),
  supplier_name: z.string().optional(),
})

export type Product = z.infer<typeof ProductSchema>
export type PaginationInfo = z.infer<typeof PaginationSchema>