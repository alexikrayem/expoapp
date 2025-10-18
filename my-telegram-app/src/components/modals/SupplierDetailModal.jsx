"use client"

// src/components/modals/SupplierDetailModal.jsx
import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { X, MapPin, Star, Package, Loader2, Maximize2 } from "lucide-react"
import ProductCard from "../common/ProductCard"
import ProductFilterBar from "../common/ProductFilterBar"
import { cityService } from "../../services/cityService"
import ImageViewer from "../common/ImageViewer"

const SupplierDetailModal = ({
  show,
  onClose,
  supplierId,
  onAddToCart,
  onToggleFavorite,
  favoriteIds,
  onSearchSupplier,
  selectedCityId,
}) => {
  const [supplier, setSupplier] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  // Local filter state for category filtering within the modal
  const [categoryFilter, setCategoryFilter] = useState({ category: 'all' })

  useEffect(() => {
    const fetchSupplierDetails = async () => {
      if (!supplierId || !show) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await cityService.getSupplierDetails(supplierId)
        setSupplier(data)
        // Reset category filter when supplier changes
        setCategoryFilter({ category: 'all' })
      } catch (err) {
        console.error("Failed to fetch supplier details:", err)
        setError(err.message || "فشل في تحميل تفاصيل المورد")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSupplierDetails()
  }, [supplierId, show])

  const handleProductClick = (product) => {
    // Close supplier modal and open product modal
    onClose()
    // You might want to emit an event or use a callback to open product modal
  }

  const handleShowMore = () => {
    if (supplier && supplier.name && onSearchSupplier) {
      onClose()
      onSearchSupplier(supplier.name)
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
    }
  }

  // Handle category filter changes
  const handleFilterChange = (newFilters) => {
    setCategoryFilter(newFilters)
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
  }

  // Filter products based on selected category
  const filteredProducts = useMemo(() => {
    if (!supplier?.products) return []
    
    if (categoryFilter.category === 'all') {
      return supplier.products
    }
    
    return supplier.products.filter(
      (product) => product.category === categoryFilter.category
    )
  }, [supplier?.products, categoryFilter.category])

  if (!show) return null

  return (
    <>
      <motion.div
        key="supplierDetailModal"
        initial={{ x: "100vw" }}
        animate={{ x: 0 }}
        exit={{ x: "100vw" }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="fixed inset-0 bg-gray-50 z-50 flex flex-col overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 shadow-md z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 truncate">
            {isLoading ? "جاري التحميل..." : supplier ? supplier.name : "تفاصيل المورد"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow">
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">جاري تحميل تفاصيل المورد...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-10 px-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <Package className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-semibold text-lg mb-2">خطأ!</p>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && supplier && (
            <>
              {/* Supplier Header Image */}
              <div className="relative">
                <div
                  className="w-full h-48 sm:h-64 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"
                  style={{
                    backgroundImage: supplier.image_url ? `url(${supplier.image_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {!supplier.image_url && (
                    <div className="text-center text-white">
                      <Package className="h-16 w-16 mx-auto mb-4 opacity-80" />
                      <h3 className="text-2xl font-bold">{supplier.name}</h3>
                    </div>
                  )}
                </div>
                {supplier.image_url && (
                  <button
                    onClick={() => {
                      setIsImageViewerOpen(true)
                      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
                    }}
                    className="absolute top-3 left-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                    title="عرض بالحجم الكامل"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Supplier Info */}
              <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{supplier.name}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {supplier.category && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-600">الفئة:</span>
                        <span className="font-medium text-gray-800">{supplier.category}</span>
                      </div>
                    )}

                    {supplier.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">الموقع:</span>
                        <span className="font-medium text-gray-800">{supplier.location}</span>
                      </div>
                    )}

                    {supplier.rating && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-gray-600">التقييم:</span>
                        <span className="font-medium text-gray-800">{supplier.rating}/5</span>
                      </div>
                    )}

                    {supplier.product_count && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        <span className="text-gray-600">المنتجات:</span>
                        <span className="font-medium text-gray-800">{supplier.product_count} منتج</span>
                      </div>
                    )}
                  </div>

                  {supplier.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-700 mb-2">نبذة عن المورد:</h4>
                      <p className="text-gray-600 leading-relaxed">{supplier.description}</p>
                    </div>
                  )}
                </div>

                {/* Products Section */}
                {supplier.products && supplier.products.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      منتجات من هذا المورد
                      {filteredProducts.length !== supplier.products.length && (
                        <span className="text-sm text-gray-500 font-normal">
                          ({filteredProducts.length} من {supplier.products.length})
                        </span>
                      )}
                    </h4>

                    {/* Category Filter Bar */}
                    <div className="mb-4 -mx-2">
                      <ProductFilterBar
                        currentFilters={categoryFilter}
                        onFiltersChange={handleFilterChange}
                        selectedCityId={selectedCityId}
                      />
                    </div>

                    {filteredProducts.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onShowDetails={handleProductClick}
                              onAddToCart={onAddToCart}
                              onToggleFavorite={onToggleFavorite}
                              isFavorite={favoriteIds.has(product.id)}
                            />
                          ))}
                        </div>

                        {supplier.hasMoreProducts && (
                          <div className="text-center mt-6">
                            <button
                              onClick={handleShowMore}
                              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                              عرض جميع المنتجات ({supplier.product_count})
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">لا توجد منتجات في هذه الفئة</p>
                        <button
                          onClick={() => setCategoryFilter({ category: 'all' })}
                          className="mt-3 text-blue-500 hover:text-blue-600 text-sm font-medium"
                        >
                          عرض جميع المنتجات
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(!supplier.products || supplier.products.length === 0) && (
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">لا توجد منتجات متاحة من هذا المورد حالياً</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      <ImageViewer
        isOpen={isImageViewerOpen}
        imageUrl={supplier?.image_url}
        imageName={supplier?.name}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </>
  )
}

export default SupplierDetailModal
