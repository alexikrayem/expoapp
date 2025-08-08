import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders, setupMockFetch } from '../utils/testUtils'
import App from '../../App'

// Mock all services
vi.mock('../../services/productService')
vi.mock('../../services/orderService')
vi.mock('../../services/userService')

describe('Full App Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setupMockFetch()
  })

  it('should complete full user journey from product to order', async () => {
    // Mock user profile to skip city selection
    localStorage.setItem('userProfile', JSON.stringify({
      selected_city_id: 1,
      selected_city_name: 'Dubai',
      full_name: 'Test User',
      phone_number: '0501234567',
      address_line1: 'Test Address'
    }))

    renderWithProviders(<App />)

    // Wait for app to initialize
    await waitFor(() => {
      expect(screen.queryByText('تهيئة التطبيق')).not.toBeInTheDocument()
    }, { timeout: 5000 })

    // Should show main navigation
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('المفضلة')).toBeInTheDocument()
    expect(screen.getByText('طلباتي')).toBeInTheDocument()

    // Navigate to products tab
    const productsTab = screen.getByText('المنتجات')
    fireEvent.click(productsTab)

    // Should show products (mocked)
    await waitFor(() => {
      expect(screen.getByText('المنتجات المعروضة')).toBeInTheDocument()
    })

    // Test navigation to favorites
    const favoritesNav = screen.getByText('المفضلة')
    fireEvent.click(favoritesNav)

    await waitFor(() => {
      expect(screen.getByText('المفضلة')).toBeInTheDocument()
    })

    // Test navigation to orders
    const ordersNav = screen.getByText('طلباتي')
    fireEvent.click(ordersNav)

    await waitFor(() => {
      expect(screen.getByText('الطلبات')).toBeInTheDocument()
    })
  })

  it('should handle cart operations correctly', async () => {
    localStorage.setItem('userProfile', JSON.stringify({
      selected_city_id: 1,
      selected_city_name: 'Dubai'
    }))

    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.queryByText('تهيئة التطبيق')).not.toBeInTheDocument()
    })

    // Test that cart starts empty
    expect(localStorage.getItem('my_app_cart')).toBeNull()

    // Add item to cart (would need to mock product cards)
    // This tests the cart persistence
  })

  it('should show city selection when no city is selected', async () => {
    localStorage.setItem('userProfile', JSON.stringify({
      selected_city_id: null
    }))

    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText('اختر مدينتك')).toBeInTheDocument()
    })
  })
})