"use client"

// src/components/modals/DealDetailModal.jsx
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Tag, Clock, Package, MapPin, Percent, Loader2, Gift, ShoppingCart } from "lucide-react"
import { cityService } from "../../services/cityService"
import { useCurrency } from "../../context/CurrencyContext"

const DealDetailModal = ({
  show,
  onClose,
  dealId,
  onProductClick,
  onSupplierClick,
  onAddToCart, // Added onAddToCart prop
}) => {
  const [deal, setDeal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    const fetchDealDetails = async () => {
      if (!dealId || !show) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await cityService.getDealDetails(dealId)
        setDeal(data)
      } catch (err) {
        console.error("Failed to fetch deal details:", err)
        setError(err.message || "فشل في تحميل تفاصيل العرض")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDealDetails()
  }, [dealId, show])

  const handleProductClick = () => {
    if (deal?.product_id && onProductClick) {
      onClose()
      onProductClick(deal.product_id)
    }
  }

  const handleSupplierClick = () => {
    if (deal?.supplier_id && onSupplierClick) {
      onClose()
      onSupplierClick(deal.supplier_id)
    }
  }

  const handleAddToCart = () => {
    if (deal && onAddToCart) {
      // Create a product object from deal data
      const product = {
        id: deal.product_id,
        name: deal.product_name,
        image_url: deal.product_image_url,
        supplier_name: deal.supplier_name,
        effective_selling_price: deal.discount_percentage
          ? deal.product_price * (1 - deal.discount_percentage / 100)
          : deal.product_price,
      }
      onAddToCart(product)
      onClose()
      window.Telegram?.WebApp?.HapticFeedback.notificationOccurred("success")
    }
  }

  if (!show) return null

  return (
    <motion.div
      key="dealDetailModal"
      initial={{ y: "100vh" }}
      animate={{ y: 0 }}
      exit={{ y: "100vh" }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="fixed inset-0 bg-gray-50 z-50 flex flex-col overflow-y-auto"
      dir="rtl"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white p-4 shadow-md z-10 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 truncate">
          {isLoading ? "جاري التحميل..." : deal ? deal.title : "تفاصيل العرض"}
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
              <p className="text-gray-600">جاري تحميل تفاصيل العرض...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-10 px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <Tag className="h-12 w-12 text-red-400 mx-auto mb-4" />
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

        {!isLoading && !error && deal && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Deal Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              {/* Deal Image */}
              <div
                className="w-full h-48 sm:h-64 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg mb-6 flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: deal.image_url ? `url(${deal.image_url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!deal.image_url && (
                  <div className="text-center text-white">
                    <Gift className="h-16 w-16 mx-auto mb-4 opacity-90" />
                    <div className="text-4xl font-bold mb-2">
                      {deal.discount_percentage ? `خصم ${deal.discount_percentage}%` : "عرض خاص"}
                    </div>
                    <div className="text-lg opacity-90">{deal.title}</div>
                  </div>
                )}
              </div>

              {/* Deal Info */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">{deal.title}</h3>

                {deal.discount_percentage && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <Percent className="h-5 w-5 text-red-600" />
                    <span className="text-red-800 font-bold text-lg">خصم {deal.discount_percentage}%</span>
                  </div>
                )}

                {deal.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">تفاصيل العرض:</h4>
                    <p className="text-gray-700 leading-relaxed">{deal.description}</p>
                  </div>
                )}

                {/* Deal Timing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {deal.start_date && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <Clock className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-green-800 text-sm">يبدأ في:</span>
                        <p className="font-medium text-green-900">
                          {new Date(deal.start_date).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {deal.end_date && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <div>
                        <span className="text-orange-800 text-sm">ينتهي في:</span>
                        <p className="font-medium text-orange-900">
                          {new Date(deal.end_date).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            {deal.supplier_name && (
              <div className="mx-4 sm:mx-6">
                <div
                  onClick={handleSupplierClick}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    المورد
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{deal.supplier_name}</p>
                      {deal.supplier_location && (
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {deal.supplier_location}
                        </p>
                      )}
                    </div>
                    <div className="text-blue-600 text-sm font-medium">عرض المتجر ←</div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Product */}
            {deal.product_id && deal.product_name && (
              <div className="mx-4 sm:mx-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-500" />
                    المنتج المرتبط بالعرض
                  </h4>

                  <div
                    onClick={handleProductClick}
                    className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {deal.product_image_url && (
                        <div
                          className="w-12 h-12 rounded-lg bg-gray-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${deal.product_image_url})` }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-blue-800">{deal.product_name}</p>
                        {deal.product_price && (
                          <div className="flex items-center gap-2 mt-1">
                            {deal.discount_percentage ? (
                              <>
                                <span className="text-sm text-gray-500 line-through">
                                  {formatPrice(deal.product_price)}
                                </span>
                                <span className="text-sm font-bold text-green-600">
                                  {formatPrice(deal.product_price * (1 - deal.discount_percentage / 100))}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-blue-600">{formatPrice(deal.product_price)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">عرض المنتج ←</div>
                  </div>
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="mx-4 sm:mx-6 pb-6">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">لا تفوت هذا العرض!</h3>
                <p className="opacity-90 mb-4">
                  {deal.end_date
                    ? `العرض ساري حتى ${new Date(deal.end_date).toLocaleDateString("ar-EG")}`
                    : "عرض محدود لفترة قصيرة"}
                </p>
                <div className="flex flex-col gap-3">
                  {deal.product_id && (
                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-white text-blue-600 py-3 px-4 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>استفد من العرض</span>
                    </button>
                  )}
                  <div className="flex gap-3">
                    {deal.product_id && (
                      <button
                        onClick={handleProductClick}
                        className="flex-1 bg-white/20 text-white py-3 px-4 rounded-lg font-bold hover:bg-white/30 transition-colors border border-white/30"
                      >
                        عرض المنتج
                      </button>
                    )}
                    <button
                      onClick={handleSupplierClick}
                      className="flex-1 bg-white/20 text-white py-3 px-4 rounded-lg font-bold hover:bg-white/30 transition-colors border border-white/30"
                    >
                      زيارة المتجر
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DealDetailModal
