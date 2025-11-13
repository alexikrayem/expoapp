// src/components/search/QuickSearchResults.jsx
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ServerCrash, Search } from "lucide-react"

const QuickSearchResultItem = ({ product, onSelect }) => (
  <motion.li
    layout="position"
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    onClick={() => onSelect(product)}
    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 cursor-pointer"
  >
    <img src={product.thumbnail_url || "/placeholder.svg"} alt={product.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
    <div className="flex-grow min-w-0">
      <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
      <p className="text-xs text-gray-500 truncate">{product.supplier_name}</p>
    </div>
    <p className="text-sm font-semibold text-blue-600 flex-shrink-0">{product.effective_selling_price} KWD</p>
  </motion.li>
)

const QuickSearchResults = ({ isSearching, error, results, searchTerm, onShowAllResults }) => {
  const products = results?.products?.items || []
  const hasResults = products.length > 0
  const topResults = products.slice(0, 3) // Show top 3

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
      },
    },
  }

  return (
    <div className="p-3">
      <AnimatePresence mode="wait">
        {isSearching && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-gray-500 py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>جاري البحث...</span>
          </motion.div>
        )}

        {error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-2 text-red-500 py-8">
            <ServerCrash className="h-8 w-8" />
            <span className="font-semibold">فشل تحميل النتائج</span>
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {!isSearching && !error && !hasResults && searchTerm.length > 1 && (
          <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-2 text-gray-500 py-8">
            <Search className="h-8 w-8" />
            <span className="font-semibold">لا توجد نتائج لـ "{searchTerm}"</span>
          </motion.div>
        )}

        {!isSearching && !error && hasResults && (
          <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
            <ul className="space-y-1">
              {topResults.map((product) => (
                <QuickSearchResultItem key={product.id} product={product} onSelect={() => {}} />
              ))}
            </ul>

            {products.length > 3 && (
              <motion.button
                onClick={onShowAllResults}
                whileHover={{ scale: 1.02 }}
                className="w-full text-center py-3 mt-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                عرض كل النتائج ({products.length})
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default QuickSearchResults