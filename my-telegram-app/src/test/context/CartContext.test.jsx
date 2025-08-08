import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '../../context/CartContext'
import { MiniCartProvider } from '../../context/MiniCartContext'

const TestWrapper = ({ children }) => (
  <MiniCartProvider>
    <CartProvider>
      {children}
    </CartProvider>
  </MiniCartProvider>
)

describe('CartContext', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100,
    effective_selling_price: 100,
    supplier_name: 'Test Supplier',
    image_url: 'test.jpg'
  }

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    expect(result.current.cartItems).toEqual([])
    expect(result.current.getCartTotal()).toBe(0)
    expect(result.current.getCartItemCount()).toBe(0)
  })

  it('adds product to cart correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
    })
    
    expect(result.current.cartItems).toHaveLength(1)
    expect(result.current.cartItems[0].product_id).toBe(1)
    expect(result.current.cartItems[0].quantity).toBe(1)
    expect(result.current.getCartItemCount()).toBe(1)
  })

  it('increases quantity when adding same product', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
      result.current.actions.addToCart(mockProduct)
    })
    
    expect(result.current.cartItems).toHaveLength(1)
    expect(result.current.cartItems[0].quantity).toBe(2)
    expect(result.current.getCartItemCount()).toBe(2)
  })

  it('calculates total correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
      result.current.actions.addToCart(mockProduct)
    })
    
    expect(result.current.getCartTotal()).toBe(200)
  })

  it('removes item when quantity becomes 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
      result.current.actions.decreaseQuantity(1)
    })
    
    expect(result.current.cartItems).toHaveLength(0)
  })

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
    })
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'my_app_cart',
      expect.stringContaining('"product_id":1')
    )
  })

  it('clears cart correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper: TestWrapper })
    
    act(() => {
      result.current.actions.addToCart(mockProduct)
      result.current.actions.clearCart()
    })
    
    expect(result.current.cartItems).toHaveLength(0)
    expect(result.current.getCartTotal()).toBe(0)
  })
})