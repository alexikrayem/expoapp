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
      {/* Search + Filters (retained local but simplified) */}
      <div className="max-w-4xl mx-auto px-4 flex flex-col gap-4 mt-6">
        {/* --- Standard Search Input --- */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="ابحث في المفضلة..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="w-full h-12 pl-12 pr-12 border border-slate-100 rounded-2xl bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base placeholder-slate-400 shadow-sm"
          />
          <Search className="absolute right-4 top-0 bottom-0 m-auto h-5 w-5 text-slate-400" />
          {localSearchTerm && (
            <button
              onClick={() => setLocalSearchTerm("")}
              className="absolute left-4 top-0 bottom-0 m-auto h-8 w-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
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
