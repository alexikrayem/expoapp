import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts } from '../../hooks/useProducts'
import { CacheProvider } from '../../context/CacheContext'
import * as productService from '../../services/productService'

vi.mock('../../services/productService')

const TestWrapper = ({ children }) => (
  <CacheProvider>{children}</CacheProvider>
)

describe('useProducts Hook', () => {
  const mockProductsResponse = {
    items: [
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 }
    ],
    currentPage: 1,
    totalPages: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
    productService.productService.getProducts.mockResolvedValue(mockProductsResponse)
  })

  it('fetches products when cityId is provided', async () => {
    const { result } = renderHook(() => useProducts('1'), { wrapper: TestWrapper })

    await waitFor(() => {
      expect(result.current.isLoadingProducts).toBe(false)
    })

    expect(result.current.products).toEqual(mockProductsResponse.items)
    expect(productService.productService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        cityId: '1',
        page: 1,
        limit: 12
      })
    )
  })

  it('does not fetch when cityId is missing', () => {
    const { result } = renderHook(() => useProducts(null), { wrapper: TestWrapper })

    expect(result.current.products).toEqual([])
    expect(result.current.isLoadingProducts).toBe(false)
    expect(productService.productService.getProducts).not.toHaveBeenCalled()
  })

  it('handles filter changes correctly', async () => {
    const { result } = renderHook(() => useProducts('1'), { wrapper: TestWrapper })

    await waitFor(() => {
      expect(result.current.isLoadingProducts).toBe(false)
    })

    act(() => {
      result.current.handleFiltersChange({ category: 'medicine' })
    })

    await waitFor(() => {
      expect(productService.productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'medicine'
        })
      )
    })
  })

  it('loads more products correctly', async () => {
    const { result } = renderHook(() => useProducts('1'), { wrapper: TestWrapper })

    await waitFor(() => {
      expect(result.current.isLoadingProducts).toBe(false)
    })

    act(() => {
      result.current.loadMoreProducts()
    })

    expect(result.current.isLoadingMore).toBe(true)
    
    await waitFor(() => {
      expect(productService.productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2
        })
      )
    })
  })
})