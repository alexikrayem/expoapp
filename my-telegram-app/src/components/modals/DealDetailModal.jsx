import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Tag, Clock, Package, MapPin, Percent, Loader2, Gift, ShoppingCart, Maximize2 } from "lucide-react"
import { cityService } from "../../services/cityService"
import { useCurrency } from "../../context/CurrencyContext"
import ImageViewer from "../common/ImageViewer"

const DealDetailModal = ({
  show,
  onClose,
  dealId,
  onProductClick,
  onSupplierClick,
  onAddToCart,
}) => {
  const [deal, setDeal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
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
    <>
      <motion.div
        key="dealDetailModal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          className="bg-white md:rounded-2xl w-full h-full md:h-[85vh] md:max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
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
                  <Tag className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">تعذر تحميل العرض</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300">
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* LEFT SIDE: VISUAL (40%) */}
          <div className="w-full md:w-[40%] bg-gradient-to-br from-orange-400 to-red-600 relative md:h-full h-[35vh] flex items-center justify-center overflow-hidden">
            {deal && deal.image_url ? (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${deal.image_url})` }}
              >
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ) : (
              <div className="text-center text-white p-6">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Gift className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">عرض مميز</h2>
                <p className="opacity-90">خصومات حصرية لفترة محدودة</p>
              </div>
            )}

            {/* Discount Badge */}
            {deal?.discount_percentage && (
              <div className="absolute bottom-6 right-6 bg-white text-red-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <Percent size={18} />
                <span>خصم {deal.discount_percentage}%</span>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: CONTENT (60%) */}
          <div className="w-full md:w-[60%] flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
            {deal && (
              <div className="p-6 md:p-8 flex-grow">
                {/* Header Info */}
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold mb-3">
                    عرض خاص
                  </span>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                    {deal.title}
                  </h1>
                  {deal.supplier_name && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Package size={14} />
                      مقدم من: <span className="font-semibold text-gray-700">{deal.supplier_name}</span>
                    </div>
                  )}
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {deal.start_date && (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                      <span className="text-green-700 text-xs font-bold block mb-1">يبدأ</span>
                      <div className="flex items-center gap-2 text-green-900 font-medium text-sm">
                        <Clock size={14} />
                        {new Date(deal.start_date).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  )}
                  {deal.end_date && (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="text-red-700 text-xs font-bold block mb-1">ينتهي</span>
                      <div className="flex items-center gap-2 text-red-900 font-medium text-sm">
                        <Clock size={14} />
                        {new Date(deal.end_date).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {deal.description && (
                  <div className="mb-8">
                    <h3 className="font-bold text-gray-800 mb-2">تفاصيل العرض</h3>
                    <p className="text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl">
                      {deal.description}
                    </p>
                  </div>
                )}

                {/* Linked Product Card */}
                {deal.product_id && (
                  <div className="mb-8 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer relative group" onClick={handleProductClick}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${deal.product_image_url || '/placeholder.svg'})` }} />
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 mb-1">{deal.product_name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">{formatPrice(deal.product_price * (1 - (deal.discount_percentage || 0) / 100))}</span>
                          {deal.discount_percentage > 0 && (
                            <span className="text-sm text-gray-400 line-through">{formatPrice(deal.product_price)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600 bg-blue-50 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ShoppingCart size={20} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto space-y-3">
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    <Gift size={20} />
                    استفد من العرض الآن
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={handleProductClick}
                      className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                    >
                      عرض المنتج
                    </button>
                    <button
                      onClick={handleSupplierClick}
                      className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                    >
                      زيارة المتجر
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <ImageViewer
        isOpen={isImageViewerOpen}
        imageUrl={deal?.image_url}
        imageName={deal?.title}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </>
  )
}

export default DealDetailModal
