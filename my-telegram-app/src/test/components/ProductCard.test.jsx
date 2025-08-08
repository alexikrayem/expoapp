import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../utils/testUtils'
import ProductCard from '../../components/common/ProductCard'

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Medicine',
    price: 100,
    effective_selling_price: 80,
    supplier_name: 'Test Pharmacy',
    image_url: 'test-image.jpg',
    stock_level: 10,
    is_on_sale: true,
    discount_price: 80
  }

  const mockProps = {
    product: mockProduct,
    onAddToCart: vi.fn(),
    onToggleFavorite: vi.fn(),
    onShowDetails: vi.fn(),
    isFavorite: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product information correctly', () => {
    renderWithProviders(<ProductCard {...mockProps} />)
    
    expect(screen.getByText('Test Medicine')).toBeInTheDocument()
    expect(screen.getByText('Test Pharmacy')).toBeInTheDocument()
  })

  it('shows sale badge when product is on sale', () => {
    renderWithProviders(<ProductCard {...mockProps} />)
    
    expect(screen.getByText('تخفيض')).toBeInTheDocument()
  })

  it('calls onAddToCart when add to cart button is clicked', () => {
    renderWithProviders(<ProductCard {...mockProps} />)
    
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addToCartButton)
    
    expect(mockProps.onAddToCart).toHaveBeenCalledWith(mockProduct)
  })

  it('calls onToggleFavorite when heart button is clicked', () => {
    renderWithProviders(<ProductCard {...mockProps} />)
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i })
    fireEvent.click(favoriteButton)
    
    expect(mockProps.onToggleFavorite).toHaveBeenCalledWith(mockProduct.id)
  })

  it('shows favorite state correctly', () => {
    renderWithProviders(<ProductCard {...mockProps} isFavorite={true} />)
    
    const heartIcon = screen.getByRole('button', { name: /favorite/i }).querySelector('svg')
    expect(heartIcon).toHaveClass('text-red-500', 'fill-red-500')
  })

  it('calls onShowDetails when card is clicked', () => {
    renderWithProviders(<ProductCard {...mockProps} />)
    
    const card = screen.getByRole('button', { name: /show details/i })
    fireEvent.click(card)
    
    expect(mockProps.onShowDetails).toHaveBeenCalledWith(mockProduct)
  })
})