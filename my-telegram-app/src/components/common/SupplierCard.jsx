import React from "react"
import { motion } from "framer-motion"
import { MapPin, Package } from "lucide-react"

const SupplierCard = ({ supplier, onShowDetails }) => {
  const placeholderImage =
    supplier.image_url ||
    "https://via.placeholder.com/120x120.png?text=Supplier"

  return (
    <motion.div
      whileHover={{ scale: 1.01, x: -2 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      onClick={() => onShowDetails(supplier.id)}
      className="group bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center p-3 sm:p-4 gap-4"
    >
      {/* Left Image / Logo */}
      <div className="flex-shrink-0 relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          <img
            src={placeholderImage}
            alt={supplier.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src =
                "https://via.placeholder.com/120x120.png?text=Supplier"
            }}
          />
        </div>
      </div>

      {/* Right Info Section */}
      <div className="flex-grow overflow-hidden">
        <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
          {supplier.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
          {supplier.category && (
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
              {supplier.category}
            </span>
          )}

          {supplier.product_count && (
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              {supplier.product_count} منتج
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 truncate">
          <MapPin className="h-3.5 w-3.5 text-green-500" />
          <span>{supplier.location || "غير محدد"}</span>
        </div>

        {supplier.description && (
          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
            {supplier.description}
          </p>
        )}
      </div>

      {/* Accent bar (optional aesthetic detail) */}
      <div className="hidden sm:block w-1.5 h-12 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  )
}

export default SupplierCard
