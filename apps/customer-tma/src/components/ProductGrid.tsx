import React, { memo } from 'react'
import { Product } from '@medical-expo/api-client'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
  onProductClick: (id: number) => void
  onAddToCart: (product: Product) => void
  onToggleFavorite: (id: number) => void
  favoriteIds: Set<number>
  isLoading?: boolean
}

export const ProductGrid = memo<ProductGridProps>(({
  products,
  onProductClick,
  onAddToCart,
  onToggleFavorite,
  favoriteIds,
  isLoading
}) => {
  if (isLoading) {
    return <ProductGridSkeleton />
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">لا توجد منتجات متاحة</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onShowDetails={() => onProductClick(product.id)}
          onAddToCart={() => onAddToCart(product)}
          onToggleFavorite={() => onToggleFavorite(product.id)}
          isFavorite={favoriteIds.has(product.id)}
        />
      ))}
    </div>
  )
})

const ProductGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
        <div className="h-32 bg-gray-200" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
)