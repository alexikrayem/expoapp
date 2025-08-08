import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders, setupMockFetch } from '../utils/testUtils'
import { CartProvider } from '../../context/CartContext'
import { CheckoutProvider } from '../../context/CheckoutContext'
import { MiniCartProvider } from '../../context/MiniCartContext'

// Mock order service
vi.mock('../../services/orderService', () => ({
  orderService: {
    createOrderFromCart: vi.fn().mockResolvedValue({ orderId: 123 })
  }
}))

// Mock user service
vi.mock('../../services/userService', () => ({
  userService: {
    updateProfile: vi.fn().mockResolvedValue({ success: true })
  }
}))

const CheckoutTestComponent = () => {
  const { cartItems, actions, getCartTotal } = useCart()
  const { startCheckout, isPlacingOrder } = useCheckout()
  
  const mockUserProfile = {
    full_name: 'Test User',
    phone_number: '0501234567',
    address_line1: 'Test Address',
    city: 'Dubai'
  }
  
  const mockTelegramUser = { id: 123456789, first_name: 'Test' }

  return (
    <div>
      <button onClick={() => actions.addToCart({
        id: 1,
        name: 'Test Product',
        price: 100,
        effective_selling_price: 100,
        supplier_name: 'Test Supplier'
      })}>
        Add to Cart
      </button>
      <div>Cart Items: {cartItems.length}</div>
      <div>Total: {getCartTotal()}</div>
      <button 
        onClick={() => startCheckout(mockUserProfile, mockTelegramUser, vi.fn())}
        disabled={isPlacingOrder}
      >
        {isPlacingOrder ? 'Placing Order...' : 'Checkout'}
      </button>
    </div>
  )
}

const TestWrapper = ({ children }) => (
  <MiniCartProvider>
    <CartProvider>
      <CheckoutProvider>
        {children}
      </CheckoutProvider>
    </CartProvider>
  </MiniCartProvider>
)

describe('Checkout Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setupMockFetch()
  })

  it('completes full checkout flow', async () => {
    renderWithProviders(<CheckoutTestComponent />, { wrapper: TestWrapper })
    
    // Add item to cart
    const addButton = screen.getByText('Add to Cart')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('Cart Items: 1')).toBeInTheDocument()
      expect(screen.getByText('Total: 100')).toBeInTheDocument()
    })
    
    // Start checkout
    const checkoutButton = screen.getByText('Checkout')
    fireEvent.click(checkoutButton)
    
    await waitFor(() => {
      expect(screen.getByText('Placing Order...')).toBeInTheDocument()
    })
  })
})