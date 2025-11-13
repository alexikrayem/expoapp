// src/components/search/MainSearchBar.jsx
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X } from "lucide-react"

const MainSearchBar = ({ isVisible, isCompact, searchTerm, onSearchTermChange, onClearSearch, onFocus, onBlur, onKeyDown, inputRef }) => {
  if (!isVisible) return null

  return (
    <motion.div
      key="main-search-bar"
      initial={{ opacity: 0, y: isCompact ? -20 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isCompact ? -20 : 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="relative w-full"
    >
      <div className="relative h-12 sm:h-12">
        <Search className="absolute right-3 sm:right-4 top-0 bottom-0 m-auto h-5 w-5 text-gray-400 z-10 pointer-events-none" />

        <div className="relative w-full h-full animated-border-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="ابحث عن المنتجات، الموردين، العروض..."
            value={searchTerm}
            onChange={onSearchTermChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="relative z-10 w-full h-full pl-10 sm:pl-12 pr-10 sm:pr-12 border border-transparent bg-transparent
              rounded-2xl focus:outline-none 
              transition-all duration-300 text-sm placeholder-gray-500 shadow-sm leading-none"
          />
        </div>

        {searchTerm && (
          <motion.button
            key="clear"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClearSearch}
            className="absolute z-20 left-2 sm:left-3 top-0 bottom-0 m-auto h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="مسح البحث"
          >
            <X className="h-5 w-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default MainSearchBar