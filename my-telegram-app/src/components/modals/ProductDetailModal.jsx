import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Heart, ShoppingCart, Share2, Info, ChevronRight, Check, AlertCircle, Loader2, Maximize2, Tag, Truck, ShieldCheck, Box, AlertTriangle, Store, Package, ChevronsRight } from "lucide-react"
import { useCurrency } from "../../context/CurrencyContext"
import { productService } from "../../services/productService"
import { cityService } from "../../services/cityService"
import RelatedProductsSection from "../common/RelatedProductsSection"
import ImageViewer from "../common/ImageViewer"
import Skeleton from "../common/Skeleton"
// Sub-component for alternative offers (kept simple)
const AlternativeProductCard = ({ product, onSelect }) => (
  <div
    onClick={() => onSelect(product.id)}
    className="flex items-center gap-4 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors border border-blue-100"
  >
    <div className="flex-grow">
      <p className="font-semibold text-blue-800">{product.name}</p>
      <p className="text-sm text-gray-600">
        متوفر لدى: <span className="font-medium">{product.supplier_name}</span>
      </p>
    </div>
    <div className="text-right">
      <p className="font-bold text-lg text-blue-700">{Number.parseFloat(product.effective_selling_price)}</p>
    </div>
    <ChevronsRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
  </div>
)

const ProductDetailModal = ({
  show,
  onClose,
  product: initialProduct,
  productId: initialProductId,
  onAddToCart,
  favoriteIds,
  onToggleFavorite,
  onSelectAlternative,
}) => {
  const { formatPrice } = useCurrency()

  const [modalData, setModalData] = useState({
    originalProduct: initialProduct,
    isAvailable: initialProduct ? initialProduct.stock_level > 0 : false,
    alternatives: [],
  })

  // New State for Related Products
  const [supplierProducts, setSupplierProducts] = useState([])
  const [categoryProducts, setCategoryProducts] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([]) // For master_product_id variants

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  // Fetch Main Details
  useEffect(() => {
    const fetchDetails = async () => {
      const idToFetch = initialProductId || initialProduct?.id
      if (!idToFetch) {
        setError("Product ID was not provided.")
        setIsLoading(false)
        return
      }

      if (!initialProduct) setIsLoading(true)
      setError(null)

      try {
        const data = await productService.getProductDetailsWithAlternatives(idToFetch)
        setModalData(data)

        // After fetching details, fetch additional related items
        if (data.originalProduct) {
          fetchRelatedItems(data.originalProduct)
        }
      } catch (err) {
        console.error("Failed to fetch product details:", err)
        setError("فشل في تحميل تفاصيل المنتج.")
      } finally {
        setIsLoading(false)
      }
    }

    if (show) fetchDetails()
  }, [show, initialProduct, initialProductId])

  // Fetch Related Logic
  const fetchRelatedItems = async (product) => {
    try {
      // 1. Fetch variants (same master_id) - logic retained from before
      if (product.master_product_id) {
        const response = await productService.getProducts({ limit: 50 })
        const related = response.items?.filter(
          p => p.master_product_id === product.master_product_id && p.id !== product.id
        ) || []
        setRelatedProducts(related.slice(0, 5))
      }

      // 2. Fetch Same Supplier
      if (product.supplier_id) {
        const response = await productService.getProducts({
          supplier_id: product.supplier_id,
          limit: 8
        })
        const sameSupplier = response.items?.filter(p => p.id !== product.id) || []
        setSupplierProducts(sameSupplier)
      }

      // 3. Fetch Same Category
      if (product.category) {
        const response = await productService.getProducts({
          category: product.category,
          limit: 8
        })
        const sameCategory = response.items?.filter(p => p.id !== product.id) || []
        setCategoryProducts(sameCategory)
      }

    } catch (err) {
      console.error("Error fetching related items:", err)
    }
  }

  // Favorite Sync
  useEffect(() => {
    if (modalData.originalProduct && favoriteIds) {
      setIsFavorited(favoriteIds.has(modalData.originalProduct.id))
    }
  }, [favoriteIds, modalData.originalProduct])

  // Handlers
  const handleAddToCart = () => {
    if (modalData.isAvailable && modalData.originalProduct) {
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("medium")
      onAddToCart(modalData.originalProduct)
      setTimeout(() => onClose(), 300)
    }
  }

  const handleToggleFavorite = () => {
    if (modalData.originalProduct) {
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
      setIsFavorited((prev) => !prev)
      setHeartKey((prev) => prev + 1)
      onToggleFavorite(modalData.originalProduct.id)
    }
  }

  const handleRelatedProductClick = (id) => {
    // If we have a handler for switching product in place, use it
    // Otherwise we might need to close and reopen or just call onSelectAlternative if it handles navigation
    if (onSelectAlternative) onSelectAlternative(id)
  }

  return (
    <>
      <motion.div
        key="productDetailModal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm"
        dir="rtl"
        onClick={onClose} // Close on backdrop click
      >
        <motion.div
          className="bg-white md:rounded-2xl w-full h-full md:h-[90vh] md:max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
          onClick={e => e.stopPropagation()} // Prevent close on content click
        >
          {/* Close Button (Absolute) */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors backdrop-blur-md"
          >
            <X className="h-6 w-6" />
          </button>

          {/* LOADING STATE (Skeleton) */}
          {isLoading && (
            <div className="absolute inset-0 z-40 bg-white flex flex-col md:flex-row">
              {/* Left Skeleton */}
              <div className="w-full md:w-[40%] h-[35vh] md:h-full p-4 md:p-6 bg-gray-50 flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-2xl shadow-inner" />
              </div>
              {/* Right Skeleton */}
              <div className="w-full md:w-[60%] p-6 md:p-8 flex flex-col">
                <Skeleton className="h-6 w-24 rounded-full mb-6" /> {/* Badge */}
                <Skeleton className="h-10 w-3/4 rounded-xl mb-4" /> {/* Title */}
                <div className="flex items-center gap-4 mb-8">
                  <Skeleton className="h-8 w-32 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>

                <div className="space-y-3 mb-8">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                </div>

                <div className="mt-auto space-y-4">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <div className="flex gap-4">
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                    <Skeleton className="h-12 flex-1 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LEFT SIDE: IMAGE & VISUALS (40%) */}
          <div className="w-full md:w-[40%] bg-gray-100 relative md:h-full h-[40vh]">
            {modalData.originalProduct && (
              <div
                className={`w-full h-full bg-cover bg-center transition-all duration-500 ${!modalData.isAvailable ? "grayscale" : ""}`}
                style={{ backgroundImage: `url(${modalData.originalProduct.image_url})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r md:from-black/20" />
              </div>
            )}

            {/* Maximize Button */}
            <button
              onClick={() => setIsImageViewerOpen(true)}
              className="absolute bottom-4 right-4 p-3 bg-white/20 hover:bg-white/40 border border-white/50 text-white rounded-full backdrop-blur-md transition-all"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>

          {/* RIGHT SIDE: CONTENT (60%) */}
          <div className="w-full md:w-[60%] flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-8 flex-grow">

              {/* Product Header */}
              {modalData.originalProduct && (
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    {modalData.originalProduct.supplier_name && (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm font-medium">
                        <Store size={14} />
                        {modalData.originalProduct.supplier_name}
                      </div>
                    )}
                    {!modalData.isAvailable && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                        <AlertTriangle size={14} />
                        غير متوفر
                      </div>
                    )}
                  </div>

                  <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    {modalData.originalProduct.name}
                  </h1>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-blue-600">
                      {formatPrice(modalData.originalProduct.effective_selling_price)}
                    </span>
                    {modalData.originalProduct.price > modalData.originalProduct.effective_selling_price && (
                      <span className="text-lg text-gray-400 line-through">
                        {formatPrice(modalData.originalProduct.price)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {modalData.originalProduct?.description && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8">
                  <h3 className="font-bold text-gray-800 mb-2">الوصف</h3>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                    {modalData.originalProduct.description}
                  </p>
                </div>
              )}

              {/* Main Actions */}
              <div className="flex items-center gap-4 mb-10 sticky bottom-0 bg-white p-4 border-t md:border-none md:p-0 md:bg-transparent md:static z-20 shadow-lg md:shadow-none">
                <button
                  onClick={handleAddToCart}
                  disabled={!modalData.isAvailable}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {modalData.isAvailable ? "إضافة للسلة" : "غير متوفر"}
                </button>

                <button
                  onClick={handleToggleFavorite}
                  className="p-4 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <motion.div
                    key={heartKey}
                    animate={{ scale: [1, 1.3, 1] }}
                  >
                    <Heart className={`w-6 h-6 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                  </motion.div>
                </button>
              </div>

              {/* RELATED SECTIONS */}
              <div className="space-y-6">

                {/* 1. Variants (Same Master ID) */}
                {relatedProducts.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Package size={18} /> خيارات أخرى لنفس المنتج
                    </h4>
                    <div className="space-y-2">
                      {relatedProducts.map(rel => (
                        <AlternativeProductCard key={rel.id} product={rel} onSelect={handleRelatedProductClick} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Same Supplier */}
                <RelatedProductsSection
                  title="من نفس المورد"
                  products={supplierProducts}
                  onProductClick={handleRelatedProductClick}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                  favoriteIds={favoriteIds}
                />

                {/* 3. Same Category */}
                <RelatedProductsSection
                  title="منتجات مشابهة"
                  products={categoryProducts}
                  onProductClick={handleRelatedProductClick}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                  favoriteIds={favoriteIds}
                />

                {/* 4. Other Suppliers (Alternatives) */}
                {modalData.alternatives && modalData.alternatives.length > 0 && (
                  <div className="mt-8 bg-green-50 p-5 rounded-xl border border-green-100">
                    <h4 className="font-bold text-green-800 mb-3">متوفر أيضاً لدى موردين آخرين</h4>
                    <div className="space-y-2">
                      {modalData.alternatives.map(alt => (
                        <AlternativeProductCard key={alt.id} product={alt} onSelect={handleRelatedProductClick} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <ImageViewer
        isOpen={isImageViewerOpen}
        imageUrl={modalData.originalProduct?.image_url}
        imageName={modalData.originalProduct?.name}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </>
  )
}

export default ProductDetailModal
