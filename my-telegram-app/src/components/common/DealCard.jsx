// src/components/common/DealCard.jsx
import React from "react"
import { motion } from "framer-motion"
import { Clock, Gift, Store } from "lucide-react"
import { useCurrency } from "../../context/CurrencyContext"

const DealCard = ({ deal, onShowDetails }) => {
  const { formatPrice } = useCurrency()

  // --- Placeholder until images are added ---
  const placeholderImage = "/images/placeholder-deal.jpg" // You can replace with your own asset
  const imageUrl = deal.image_url || placeholderImage

  const discountedPrice =
    deal.discount_percentage && deal.product_price
      ? deal.product_price * (1 - deal.discount_percentage / 100)
      : deal.product_price

  const formattedEndDate = deal.end_date
    ? new Date(deal.end_date).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      onClick={() => onShowDetails(deal.id)}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative w-full bg-gray-100">
        <img
          src={imageUrl}
          alt={deal.title}
          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = placeholderImage
          }}
        />

        {/* Discount Badge */}
        {deal.discount_percentage && (
          <div className="absolute top-3 right-3 bg-white/90 text-red-600 text-sm font-bold rounded-full px-3 py-1 shadow-md backdrop-blur-sm">
            خصم {deal.discount_percentage}%
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col gap-3 bg-gray-50">
        <h3 className="font-bold text-lg text-gray-800 leading-tight line-clamp-2">
          {deal.title}
        </h3>

        {deal.description && (
          <p className="text-gray-700 font-semibold text-sm leading-snug line-clamp-2">
            {deal.description}
          </p>
        )}

        {deal.supplier_name && (
          <div className="flex items-center text-gray-600 text-sm gap-1">
            <Store className="h-4 w-4 text-blue-500" />
            <span>{deal.supplier_name}</span>
          </div>
        )}

        {/* Price */}
        {deal.product_price && (
          <div className="flex items-baseline gap-2">
            {deal.discount_percentage && (
              <span className="text-gray-400 text-sm line-through">
                {formatPrice(deal.product_price)}
              </span>
            )}
            <span className="text-lg font-bold text-green-600">
              {formatPrice(discountedPrice)}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-1">
          {formattedEndDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-4 w-4" />
              <span>ينتهي {formattedEndDate}</span>
            </div>
          )}
          <button
  onClick={() => onShowDetails(deal.id)}
  className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
>
  عرض التفاصيل
</button>
        </div>
      </div>
    </motion.div>
  )
}

export default DealCard
