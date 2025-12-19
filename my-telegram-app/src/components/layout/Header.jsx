import { useSearch } from "../../context/SearchContext"
import { useCart } from "../../context/CartContext"
import { useFavorites } from "../../hooks/useFavorites"
import { useModal } from "../../context/ModalContext"
import { useOutletContext } from "react-router-dom"
import { motion } from "framer-motion"
import SearchPopover from "../search/SearchPopover"

const Header = ({ title, description, children }) => {
  const { searchTerm, handleSearchTermChange, clearSearch, isSearching, searchError, searchResults, isSearchPopoverOpen, setIsSearchPopoverOpen } = useSearch()

  // Hooks for SearchResultsView functionality
  const { telegramUser } = useOutletContext() || {}
  const { actions: { addToCart } } = useCart()
  const { favoriteIds, toggleFavorite } = useFavorites(telegramUser)
  const { openModal } = useModal()

  // Handlers for Opening Modals
  const handleShowProductDetails = (product) => {
    if (!product || !product.id) return
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
    openModal("productDetail", {
      product: product,
      productId: product.id,
      onAddToCart: addToCart,
      favoriteIds: favoriteIds,
      onToggleFavorite: toggleFavorite,
      onSelectAlternative: (alternativeId) => handleShowProductDetails({ id: alternativeId }),
    })
  }

  const handleShowDealDetails = (dealId) => {
    if (!dealId) return
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
    openModal("dealDetail", {
      dealId,
      onProductClick: (productId) => handleShowProductDetails({ id: productId }),
      onSupplierClick: (supplierId) => handleShowSupplierDetails(supplierId),
      onAddToCart: addToCart
    })
  }

  const handleShowSupplierDetails = (supplierId) => {
    if (!supplierId) return
    window.Telegram?.WebApp?.HapticFeedback.impactOccurred("light")
    openModal("supplierDetail", {
      supplierId,
      onAddToCart: addToCart,
      onToggleFavorite: toggleFavorite,
      favoriteIds
    })
  }

  return (
    <div className="w-full">
      <SearchPopover
        isOpen={isSearchPopoverOpen}
        onClose={() => setIsSearchPopoverOpen(false)}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        onClearSearch={clearSearch}
        isSearching={isSearching}
        searchError={searchError}
        searchResults={searchResults}
        // Passed props for SearchResultsView
        onShowProductDetails={handleShowProductDetails}
        onShowDealDetails={handleShowDealDetails}
        onShowSupplierDetails={handleShowSupplierDetails}
        onAddToCart={addToCart}
        onToggleFavorite={toggleFavorite}
        favoriteIds={favoriteIds}
      />

      <header className="pt-8 pb-4 px-4 sm:px-0">
        <div className="flex flex-col gap-1">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-slate-900 tracking-tight"
          >
            {title || "الرئيسية"}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 text-sm md:text-base font-medium"
            >
              {description}
            </motion.p>
          )}
        </div>

        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </header>
    </div>
  )
}

export default Header;