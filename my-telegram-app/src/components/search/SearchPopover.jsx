import React, { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DOMPurify from "dompurify"
import MainSearchBar from "./MainSearchBar"
import SearchResultsView from "./SearchResultsView"

const SearchPopover = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchTermChange,
  onClearSearch,
  isSearching,
  searchError,
  searchResults,
  onShowProductDetails,
  onShowDealDetails,
  onShowSupplierDetails,
  onAddToCart,
  onToggleFavorite,
  favoriteIds,
}) => {
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 p-4 pt-4 flex flex-col pointer-events-none"
          >
            {/* Backdrop logic handles click outside if needed, but the container below covers most */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col h-full max-h-[90vh] pointer-events-auto border border-white/20">
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <MainSearchBar
                  isVisible={true}
                  isCompact={false}
                  searchTerm={searchTerm}
                  onSearchTermChange={(e) => onSearchTermChange(DOMPurify.sanitize(e.target.value))}
                  onClearSearch={onClearSearch}
                  onFocus={() => { }}
                  onBlur={() => { }}
                  onKeyDown={(e) => { }} // Remove enter to navigation logic
                  inputRef={searchInputRef}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <SearchResultsView
                  searchTerm={searchTerm}
                  isSearching={isSearching}
                  error={searchError}
                  results={searchResults}
                  // Pass through the props we added to Header
                  onShowProductDetails={onShowProductDetails}
                  onShowDealDetails={onShowDealDetails}
                  onShowSupplierDetails={onShowSupplierDetails}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                  favoriteIds={favoriteIds}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SearchPopover