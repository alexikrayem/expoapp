// src/components/search/SearchPopover.jsx
import React, { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DOMPurify from "dompurify"
import MainSearchBar from "./MainSearchBar"
import QuickSearchResults from "./QuickSearchResults"

const SearchPopover = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchTermChange,
  onClearSearch,
  isSearching,
  searchError,
  searchResults,
  onShowAllResults,
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
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
            aria-hidden="true"
          />
          <motion.div
            key="search-popover"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 p-3 pt-[calc(env(safe-area-inset-top,0.75rem)+0.75rem)]"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl mx-auto flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <MainSearchBar
                  isVisible={true}
                  isCompact={true}
                  searchTerm={searchTerm}
                  onSearchTermChange={(e) => onSearchTermChange(DOMPurify.sanitize(e.target.value))}
                  onClearSearch={onClearSearch}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onShowAllResults()
                      onClose()
                    }
                  }}
                  inputRef={searchInputRef}
                />
              </div>

              <div className="min-h-[200px]">
                <QuickSearchResults
                  isSearching={isSearching}
                  error={searchError}
                  results={searchResults}
                  searchTerm={searchTerm}
                  onShowAllResults={() => {
                    onShowAllResults()
                    onClose()
                  }}
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