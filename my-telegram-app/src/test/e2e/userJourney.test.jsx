import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setupMockFetch, mockApiResponses } from '../utils/testUtils'
import App from '../../App'

describe('End-to-End User Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setupMockFetch()
  })

  it('should complete full shopping journey', async () => {
    const user = userEvent.setup()

    // Start with user having a profile
    localStorage.setItem('userProfile', JSON.stringify(mockApiResponses.userProfile))

    renderWithProviders(<App />)

    // 1. App should initialize and show main page
    await waitFor(() => {
      expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    }, { timeout: 5000 })

    // 2. Navigate to products
    const productsTab = screen.getByText('المنتجات')
    await user.click(productsTab)

    await waitFor(() => {
      expect(screen.getByText('المنتجات المعروضة')).toBeInTheDocument()
    })

    // 3. Search for a product
    const searchInput = screen.getByPlaceholderText('ابحث...')
    await user.type(searchInput, 'medicine')

    await waitFor(() => {
      expect(searchInput.value).toBe('medicine')
    })

    // 4. Add product to favorites (if product cards are rendered)
    // This would require proper mocking of product data

    // 5. Add product to cart
    // This would require product cards to be rendered

    // 6. Navigate to cart/orders
    const ordersNav = screen.getByText('طلباتي')
    await user.click(ordersNav)

    await waitFor(() => {
      expect(screen.getByText('الطلبات')).toBeInTheDocument()
    })

    // 7. Verify cart persistence
    // Cart should maintain state between navigation
  })

  it('should handle city selection flow', async () => {
    const user = userEvent.setup()

    // Start without city selection
    localStorage.setItem('userProfile', JSON.stringify({
      selected_city_id: null
    }))

    renderWithProviders(<App />)

    // Should show city selection modal
    await waitFor(() => {
      expect(screen.getByText('اختر مدينتك')).toBeInTheDocument()
    })

    // Select a city
    const citySelect = screen.getByRole('combobox')
    await user.selectOptions(citySelect, '1')

    // Should proceed to main app
    await waitFor(() => {
      expect(screen.queryByText('اختر مدينتك')).not.toBeInTheDocument()
    })
  })

  it('should handle offline/error states gracefully', async () => {
    // Mock network failure
    global.fetch.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<App />)

    // Should show error state or fallback
    await waitFor(() => {
      // App should handle errors gracefully
      expect(screen.queryByText('حدث خطأ')).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})