"use client"

// src/components/modals/ProductDetailModal.jsx (CORRECTED)
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, ShoppingCart, Heart, AlertTriangle, ChevronsRight, Loader2, Maximize2, Package } from "lucide-react"
import { useCurrency } from "../../context/CurrencyContext"
import { productService } from "../../services/productService"
import ImageViewer from "../common/ImageViewer"

// This sub-component is correct and does not need changes.
const AlternativeProductCard = ({ product, onSelect }) => (
  <div
    onClick={() => onSelect(product.id)}
    className="flex items-center gap-4 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
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

const RelatedProductCard = ({ product, onSelect, formatPrice }) => (
  <div
    onClick={() => onSelect(product.id)}
    className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition-all hover:shadow-md border border-purple-200"
  >
    <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
      <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
    </div>
    <div className="flex-grow min-w-0">
      <p className="font-semibold text-purple-900 truncate">{product.name}</p>
      <p className="text-sm text-gray-600 truncate">{product.supplier_name}</p>
      <p className="font-bold text-purple-700 mt-1">{formatPrice(product.effective_selling_price)}</p>
    </div>
    <ChevronsRight className="h-5 w-5 text-purple-500 flex-shrink-0" />
  </div>
)

// FIX: The component's props have been simplified.
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

  // FIX: Internal state variables are now uniquely named to avoid conflict with props.
  const [modalData, setModalData] = useState({
    originalProduct: initialProduct,
    isAvailable: initialProduct ? initialProduct.stock_level > 0 : false,
    alternatives: [],
  })
  const [relatedProducts, setRelatedProducts] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      const idToFetch = initialProductId || initialProduct?.id
      if (!idToFetch) {
        setError("Product ID was not provided to the modal.")
        setIsLoading(false)
        return
      }

      if (!initialProduct) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const data = await productService.getProductDetailsWithAlternatives(idToFetch)
        console.log("[v0] Product details fetched:", data)
        setModalData(data)

        if (data.originalProduct) {
          // No need to update local state here as we are using onToggleFavorite.isFavorite directly
        }

        if (data.originalProduct?.master_product_id) {
          console.log("[v0] Fetching related products for master_product_id:", data.originalProduct.master_product_id)
          setIsLoadingRelated(true)
          try {
            // Fetch all products and filter client-side since backend doesn't support master_product_id filter
            const response = await productService.getProducts({
              limit: 100, // Fetch more to ensure we get related products
            })

            // Filter for products with same master_product_id, excluding current product
            const related =
              response.items?.filter(
                (p) =>
                  p.master_product_id === data.originalProduct.master_product_id && p.id !== data.originalProduct.id,
              ) || []

            console.log("[v0] Related products found:", related.length)
            setRelatedProducts(related.slice(0, 5)) // Limit to 5 related products
          } catch (err) {
            console.error("[v0] Failed to fetch related products:", err)
            setRelatedProducts([])
          } finally {
            setIsLoadingRelated(false)
          }
        } else {
          console.log("[v0] No master_product_id found, skipping related products")
        }
      } catch (err) {
        console.error("Failed to fetch full product details in modal:", err)
        setError(err.message || "Failed to load product details.")
      } finally {
        setIsLoading(false)
      }
    }

    if (show) {
      fetchDetails()
    }
  }, [show, initialProduct, initialProductId]) // Rerun effect if the product being shown changes.

  useEffect(() => {
    if (modalData.originalProduct && favoriteIds) {
      const newIsFavorited = favoriteIds.has(modalData.originalProduct.id)
      console.log("[v0] Favorite status check:", {
        productId: modalData.originalProduct.id,
        isFavorited: newIsFavorited,
        favoriteIdsSize: favoriteIds.size,
        favoriteIdsArray: Array.from(favoriteIds),
      })
      setIsFavorited(newIsFavorited)
    }
  }, [favoriteIds, modalData.originalProduct])

  const handleAddToCart = () => {
    if (modalData.isAvailable && modalData.originalProduct) {
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("medium")
      onAddToCart(modalData.originalProduct)
      // Close modal after adding to cart
      setTimeout(() => {
        onClose()
      }, 300)
    }
  }

  const handleToggleFavorite = () => {
    if (modalData.originalProduct) {
      console.log("[v0] Toggle favorite clicked for product:", modalData.originalProduct.id)
      window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")

      setIsFavorited((prev) => !prev)
      setHeartKey((prev) => prev + 1)

      // Call the actual toggle function
      onToggleFavorite(modalData.originalProduct.id)
    }
  }

  const handleRelatedProductClick = (relatedProductId) => {
    if (onSelectAlternative) {
      onSelectAlternative(relatedProductId)
    }
  }

  const handleSelectAlternative = (alternativeProductId) => {
    if (onSelectAlternative) {
      onSelectAlternative(alternativeProductId)
    }
  }

  return (
    <>
      <motion.div
        key="productDetailModal"
        initial={{ y: "100vh" }}
        animate={{ y: 0 }}
        exit={{ y: "100vh" }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="fixed inset-0 bg-gradient-to-b from-gray-50 to-white z-50 flex flex-col overflow-y-auto"
        dir="rtl"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 p-4 shadow-lg z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white truncate">
            {isLoading && !modalData.originalProduct
              ? "جاري التحميل..."
              : modalData.originalProduct
                ? modalData.originalProduct.name
                : "تفاصيل المنتج"}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-grow p-4 md:p-6">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
          {error && (
            <div className="text-center py-10">
              <p className="text-red-500 font-semibold text-lg">خطأ!</p>
              <p className="text-gray-600 mt-2">{error}</p>
            </div>
          )}

          {!isLoading && !error && modalData.originalProduct && (
            <div className="space-y-6">
              {!modalData.isAvailable && (
                <div
                  className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg shadow-sm"
                  role="alert"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-6 w-6 ml-3 flex-shrink-0" />
                    <div>
                      <p className="font-bold">هذا المنتج غير متوفر حالياً.</p>
                      <p className="text-sm">قد يكون متوفراً لدى موردين آخرين أدناه.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <div
                  className={`w-full h-72 sm:h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-lg bg-cover bg-center ${!modalData.isAvailable ? "grayscale" : ""}`}
                  style={{ backgroundImage: `url(${modalData.originalProduct.image_url})` }}
                ></div>
                <button
                  onClick={() => {
                    setIsImageViewerOpen(true)
                    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
                  }}
                  className="absolute top-3 left-3 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-sm shadow-lg hover:scale-110"
                  title="عرض بالحجم الكامل"
                >
                  <Maximize2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  {modalData.originalProduct.name}
                </h1>
                {modalData.originalProduct.supplier_name && (
                  <p className="text-md text-gray-500 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    المورد:{" "}
                    <span className="font-semibold text-gray-700">{modalData.originalProduct.supplier_name}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-2">
                  <p
                    className={`text-4xl font-extrabold ${modalData.isAvailable ? "text-blue-600" : "text-gray-400 line-through"}`}
                  >
                    {formatPrice(modalData.originalProduct.effective_selling_price)}
                  </p>
                </div>
              </div>

              {modalData.originalProduct.description && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                    الوصف
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{modalData.originalProduct.description}</p>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!modalData.isAvailable}
                  className="flex-grow bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <ShoppingCart className="h-5 w-5" /> {modalData.isAvailable ? "إضافة للسلة" : "غير متوفر"}
                </button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleFavorite}
                  className="p-4 border-2 border-gray-300 rounded-xl text-gray-600 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                >
                  <motion.div
                    key={heartKey}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    <Heart
                      className={`h-6 w-6 transition-all duration-200 ${isFavorited ? "text-red-500 fill-red-500" : "text-gray-400"}`}
                    />
                  </motion.div>
                </motion.button>
              </div>

              {isLoadingRelated && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 shadow-sm border border-purple-200">
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري تحميل المنتجات المشابهة...</span>
                  </div>
                </div>
              )}

              {!isLoadingRelated && relatedProducts && relatedProducts.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 shadow-sm border border-purple-200">
                  <h4 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    منتجات مشابهة (نفس النوع)
                  </h4>
                  <div className="space-y-3">
                    {relatedProducts.map((related) => (
                      <RelatedProductCard
                        key={related.id}
                        product={related}
                        onSelect={handleRelatedProductClick}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>
                </div>
              )}

              {modalData.alternatives && modalData.alternatives.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 shadow-sm border border-green-200">
                  <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                    <ChevronsRight className="h-5 w-5" />
                    متوفر لدى موردين آخرين
                  </h4>
                  <div className="space-y-3">
                    {modalData.alternatives.map((alt) => (
                      <AlternativeProductCard key={alt.id} product={alt} onSelect={handleSelectAlternative} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
