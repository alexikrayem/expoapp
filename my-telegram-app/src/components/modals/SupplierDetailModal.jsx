import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { X, MapPin, Star, Package, Loader2, Maximize2, Filter, Store } from "lucide-react"
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
  const [categoryFilter, setCategoryFilter] = useState({ category: 'all' })

  useEffect(() => {
    const fetchSupplierDetails = async () => {
      if (!supplierId || !show) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await cityService.getSupplierDetails(supplierId)
        setSupplier(data)
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
    onClose()
    // Logic to open product modal would typically go here or be handled by parent
  }

  const handleShowMore = () => {
    if (supplier && supplier.name && onSearchSupplier) {
      onClose()
      onSearchSupplier(supplier.name)
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
    }
  }

  const handleFilterChange = (newFilters) => {
    setCategoryFilter(newFilters)
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
  }

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          className="bg-white md:rounded-2xl w-full h-full md:h-[90vh] md:max-w-7xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors backdrop-blur-md"
          >
            <X className="h-6 w-6" />
          </button>

          {/* LOADING STATE */}
          {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}

          {/* ERROR STATE */}
          {error && !isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-white">
              <div className="text-center p-6">
                <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
                  <Package className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">تعذر تحميل المورد</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300">
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && supplier && (
            <>
              {/* LEFT SIDE: SUPPLIER INFO (30%) - STICKY ON DESKTOP */}
              <div className="w-full md:w-[30%] bg-gray-50 border-l border-gray-200 flex flex-col h-auto md:h-full overflow-y-auto custom-scrollbar">
                {/* Header Image */}
                <div className="relative h-48 md:h-64 flex-shrink-0">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: supplier.image_url ? `url(${supplier.image_url})` : 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' }}
                  >
                    <div className="absolute inset-0 bg-black/30" />
                  </div>
                  {!supplier.image_url && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Store className="w-16 h-16 text-white/80" />
                    </div>
                  )}
                  {supplier.image_url && (
                    <button
                      onClick={() => setIsImageViewerOpen(true)}
                      className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Info Content */}
                <div className="p-6 space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{supplier.name}</h1>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {supplier.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Package size={12} /> {supplier.category}
                        </span>
                      )}
                      {supplier.rating && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star size={12} className="fill-yellow-800" /> {supplier.rating}
                        </span>
                      )}
                    </div>

                    {supplier.location && (
                      <p className="text-gray-600 text-sm flex items-start gap-2">
                        <MapPin size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                        {supplier.location}
                      </p>
                    )}
                  </div>

                  {supplier.description && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">نبذة عن المورد</h3>
                      <p className="text-sm text-gray-600 leading-relaxed text-justify">
                        {supplier.description}
                      </p>
                    </div>
                  )}

                  {/* Contact / Action Buttons could go here */}
                </div>
              </div>

              {/* RIGHT SIDE: PRODUCTS GRID (70%) */}
              <div className="w-full md:w-[70%] bg-white flex flex-col h-full overflow-hidden">
                {/* Filter Header */}
                <div className="p-4 border-b border-gray-100 bg-white z-10 sticky top-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Package className="text-blue-500" />
                      منتجات المورد
                      <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {supplier.products?.length || 0}
                      </span>
                    </h2>
                  </div>

                  {/* Horizontal Filter Scroll */}
                  <div className="-mx-2">
                    <ProductFilterBar
                      currentFilters={categoryFilter}
                      onFiltersChange={handleFilterChange}
                      selectedCityId={selectedCityId}
                    />
                  </div>
                </div>

                {/* Products Grid */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
                  {filteredProducts.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onShowDetails={handleProductClick} // Note: This needs to be hooked up to open ProductDetailModal
                            onAddToCart={onAddToCart}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={favoriteIds && favoriteIds.has(product.id)}
                            compact={true}
                          />
                        ))}
                      </div>

                      {supplier.hasMoreProducts && (
                        <div className="text-center mt-8 pb-4">
                          <button
                            onClick={handleShowMore}
                            className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-full font-medium hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                          >
                            عرض المزيد من المنتجات
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <Filter className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد منتجات</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mb-4">
                        لا توجد منتجات مطابقة للفلتر المحدد في هذا القسم.
                      </p>
                      <button
                        onClick={() => setCategoryFilter({ category: 'all' })}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        مسح الفلتر
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
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
