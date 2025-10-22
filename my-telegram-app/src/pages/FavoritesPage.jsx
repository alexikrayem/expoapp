"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useOutletContext } from "react-router-dom"
import { useFavorites } from "../hooks/useFavorites"
import { useFavoriteProducts } from "../hooks/useFavoriteProducts"
import { useModal } from "../context/ModalContext"
import { useCart } from "../context/CartContext"
import FavoritesTab from "../components/tabs/FavoritesTab"
import ProductFilterBar from "../components/common/ProductFilterBar"
import { Search, X } from "lucide-react"
import appLogoImage from "/src/assets/IMG_1787.png"; // Adjust path if necessary
import { motion } from "framer-motion";

const FavoritesPage = () => {
  // ✅ Fix: Prevent "Cannot destructure property of undefined"
  const { telegramUser, userProfile } = useOutletContext() || {}

  const { openModal } = useModal()
  const {
    actions: { addToCart },
  } = useCart()

  const { favoriteIds, toggleFavorite } = useFavorites(telegramUser)
  const {
    favoriteProducts,
    isLoadingFavoritesTab,
    favoritesTabError,
  } = useFavoriteProducts(favoriteIds, true)

  const [localFilters, setLocalFilters] = useState({ category: "all" })
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const [isCompact, setIsCompact] = useState(false)

  // --- Compact header on scroll ---
  useEffect(() => {
    const handleScroll = () => setIsCompact(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleFiltersChange = (newFilters) => setLocalFilters(newFilters)

  // --- Filtering + Searching ---
  const filteredAndSearchedProducts = useMemo(() => {
    if (!favoriteProducts) return []

    let filtered =
      localFilters.category === "all"
        ? favoriteProducts
        : favoriteProducts.filter((p) => p.category === localFilters.category)

    const searchTerm = localSearchTerm.trim().toLowerCase()
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm)),
      )
    }

    return filtered
  }, [favoriteProducts, localFilters.category, localSearchTerm])

  const handleShowProductDetails = (product) => {
    openModal("productDetail", {
      product,
      productId: product.id,
      onAddToCart: addToCart,
      onToggleFavorite: { toggle: toggleFavorite, isFavorite: (id) => favoriteIds.has(id) },
    })
  }

  return (
    <div className="pb-24">
      {/* Sticky Header with Search + Filters */}
      <div
   className={`sticky top-0 z-20 pt-[env(safe-area-inset-top, 16px)] bg-white/95 backdrop-blur-sm transition-all ${
     isCompact ? "shadow-md py-2" : "shadow-sm py-4"
   }`}
>
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-3">
          {/* --- PREHEADER COMPONENT: Centered Logo + Brand Text --- */}
<motion.div
  className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2 mt-4"
>
  <img
    src={appLogoImage}
    alt="App Logo"
    className="object-contain rounded-xl w-10 h-10 sm:w-12 sm:h-12 mt-6"
  />
  <div className="flex flex-col items-center text-center mt-6">
    <span className="text-lg sm:text-xl font-bold text-gray-800 leading-tight truncate">
      معرض طبيب
    </span>
    <span className="text-sm text-gray-500 leading-tight truncate">
      المستلزمات الطبية
    </span>
  </div>
</motion.div>

          {/* Title */}
          <div
            className={`flex flex-col transition-all duration-300 ${
              isCompact ? "text-gray-800 text-xl" : "text-gray-800 text-3xl"
            }`}
          >
            <h1 className="font-bold text-gray-800 leading-tight">المفضلة</h1>
            <p className="text-gray-500 text-sm">المنتجات التي قمت بحفظها.</p>
          </div>

          {/* --- Standard Search Input --- */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ابحث في المفضلة..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
              className="w-full h-10 pl-10 pr-10 border border-gray-300 rounded-2xl bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm placeholder-gray-500"
            />
            <Search className="absolute right-3 top-0 bottom-0 m-auto h-5 w-5 text-gray-400" />
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm("")}
                className="absolute left-3 top-0 bottom-0 m-auto h-8 w-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <ProductFilterBar
            currentFilters={localFilters}
            onFiltersChange={handleFiltersChange}
            selectedCityId={userProfile?.selected_city_id}
          />
        </div>
      </div>

      {/* --- Main Favorites Content --- */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <FavoritesTab
          favoriteProducts={filteredAndSearchedProducts}
          isLoading={isLoadingFavoritesTab}
          error={favoritesTabError}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          onShowDetails={handleShowProductDetails}
          favoriteProductIds={favoriteIds}
        />
      </div>
    </div>
  )
}

export default FavoritesPage
