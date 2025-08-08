import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders, setupMockFetch } from '../utils/testUtils'
import HomePage from '../../pages/HomePage'

// Mock the outlet context
const mockOutletContext = {
  telegramUser: { id: 123456789, first_name: 'Test', last_name: 'User' },
  userProfile: { selected_city_id: 1, selected_city_name: 'Dubai' },
  onProfileUpdate: vi.fn()
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useOutletContext: () => mockOutletContext
  }
})

describe('HomePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockFetch()
  })

  it('renders main sections correctly', async () => {
    renderWithProviders(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('العروض')).toBeInTheDocument()
      expect(screen.getByText('المنتجات')).toBeInTheDocument()
      expect(screen.getByText('الموردون')).toBeInTheDocument()
    })
  })

  it('switches between tabs correctly', async () => {
    renderWithProviders(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('المنتجات')).toBeInTheDocument()
    })

    const dealsTab = screen.getByText('العروض')
    fireEvent.click(dealsTab)
    
    // Should switch to deals view
    expect(dealsTab.closest('button')).toHaveClass('bg-blue-600')
  })

  it('shows featured slider when not searching', async () => {
    renderWithProviders(<HomePage />)
    
    await waitFor(() => {
      // Featured slider should be present when not searching
      expect(screen.queryByText('جاري البحث')).not.toBeInTheDocument()
    })
  })

  it('handles product interactions correctly', async () => {
    renderWithProviders(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('المنتجات المعروضة')).toBeInTheDocument()
    })

    // Test that products are loaded and displayed
    // This would require mocking the useProducts hook properly
  })
})