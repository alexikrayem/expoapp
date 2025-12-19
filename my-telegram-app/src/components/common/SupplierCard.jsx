import React from "react"
import { motion } from "framer-motion"
import { MapPin, Package } from "lucide-react"

const SupplierCard = ({ supplier, onShowDetails }) => {
  const placeholderImage =
    supplier.image_url ||
    "https://via.placeholder.com/120x120.png?text=Supplier"

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      onClick={() => onShowDetails(supplier.id)}
      className="group bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer flex items-center p-3 sm:p-4 gap-4"
    >
      {/* Left Image / Logo */}
      <div className="flex-shrink-0 relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-50">
          <img
            src={placeholderImage}
            alt={supplier.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
        <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate group-hover:text-blue-600 transition-colors">
          {supplier.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
          {supplier.category && (
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              {supplier.category}
            </span>
          )}

          {supplier.product_count && (
            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              {supplier.product_count} منتج
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-300" />
          <span>{supplier.location || "غير محدد"}</span>
        </div>

        {supplier.description && (
          <p className="text-slate-500 text-xs mt-2 line-clamp-1 leading-relaxed">
            {supplier.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default SupplierCard
