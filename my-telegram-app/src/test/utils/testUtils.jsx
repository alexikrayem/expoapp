import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { CurrencyProvider } from '../../context/CurrencyContext'
import { ModalProvider } from '../../context/ModalContext'
import { CartProvider } from '../../context/CartContext'
import { MiniCartProvider } from '../../context/MiniCartContext'
import { CacheProvider } from '../../context/CacheContext'

// Test wrapper with all necessary providers
export const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <ModalProvider>
          <CacheProvider>
            <MiniCartProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </MiniCartProvider>
          </CacheProvider>
        </ModalProvider>
      </CurrencyProvider>
    </BrowserRouter>
  )
}

// Custom render function
export const renderWithProviders = (ui, options = {}) => {
  return render(ui, { wrapper: TestWrapper, ...options })
}

// Mock API responses
export const mockApiResponses = {
  products: {
    items: [
      {
        id: 1,
        name: 'Test Product',
        price: 100,
        effective_selling_price: 100,
        supplier_name: 'Test Supplier',
        image_url: 'test.jpg',
        stock_level: 10,
        category: 'Medicine'
      }
    ],
    currentPage: 1,
    totalPages: 1
  },
  cities: [
    { id: 1, name: 'Dubai' },
    { id: 2, name: 'Abu Dhabi' }
  ],
  userProfile: {
    user_id: 123456789,
    full_name: 'Test User',
    phone_number: '0501234567',
    address_line1: 'Test Address',
    city: 'Dubai',
    selected_city_id: 1,
    selected_city_name: 'Dubai'
  }
}

// Mock fetch responses
export const setupMockFetch = () => {
  global.fetch.mockImplementation((url) => {
    if (url.includes('/products')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.products)
      })
    }
    if (url.includes('/cities')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.cities)
      })
    }
    if (url.includes('/user/profile')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.userProfile)
      })
    }
    return Promise.reject(new Error('Unknown endpoint'))
  })
}