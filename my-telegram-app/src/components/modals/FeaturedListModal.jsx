"use client"

import { useState, useEffect } from "react"
import { X, Loader, Package, Zap } from "lucide-react" // Added Zap (Deal icon)
import { motion, AnimatePresence } from "framer-motion"
import { useModal } from "../../context/ModalContext"
import { apiClient } from "../../api/apiClient"
import { useCurrency } from "../../context/CurrencyContext"

const FeaturedListModal = ({ isOpen, onClose, list }) => {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const { openModal } = useModal()
  const { formatPrice } = useCurrency()

  useEffect(() => {
    // Fetch when opening
    if (isOpen && !isClosing && list?.id) {
      fetchListItems()
    } else if (!isOpen && !isClosing) {
      // Small delay to clear state after exit animation finishes
      setTimeout(() => {
        setItems([])
        setIsLoading(true)
        setError("")
      }, 300)
    }
  }, [isOpen, isClosing, list?.id])

  const fetchListItems = async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await apiClient(`featured-items/list/${list.id}`)
      setItems(data || [])
    } catch (err) {
      console.error("Error fetching list items:", err)
      setError(err.message || "Failed to load list items")
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item) => {
    if (item.type === "product") {
      openModal("productDetail", {
        productId: item.id,
        product: {
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          price: item.price,
          // city_id is missing from your item object, ensure it's in your backend fetch
          // city_id: item.city_id, 
        },
      })
    } else if (item.type === "deal") {
      openModal("dealDetail", {
        dealId: item.id,
        deal: {
          id: item.id,
          title: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          discount: item.discount,
          // city_id is missing from your item object, ensure it's in your backend fetch
          // city_id: item.city_id,
        },
      })
    }
    // We close the list modal BEFORE opening the detail modal for a smooth transition
    handleClose()
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300) 
  }

  return (
    <AnimatePresence>
      {(isOpen || isClosing) && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ y: "100vh", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100vh", opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
            className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto"
            dir="rtl" 
          >
            {/* 🔽 NEW MODERN HEADER DESIGN: Image + Gradient Overlay 🔽 */}
           <div className="relative w-full pb-[56.25%] flex-shrink-0">
              {/* Background Image from the slider list item */}
              <img
                src={list.imageUrl || "/placeholder.svg"}
                alt={list.title}
                className="absolute inset-0 w-full h-full object-contain bg-gray-100"
              />
              {/* Gradient Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent/10"></div>
              
              {/* Content and Close Button */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Close Button (Top Right) */}
                <div className="flex justify-end">
                    <button
                        onClick={handleClose}
                        className="text-white bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-sm transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Title and Description (Bottom Left) */}
                <div className="text-white">
                  <h2 className="text-3xl font-extrabold leading-tight drop-shadow-md">
                    {list.title}
                  </h2>
                  <p className="text-sm font-light mt-1 drop-shadow-sm">
                    {list.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-grow flex flex-col">
              {error && (
                <div className="bg-red-100 text-red-700 p-4 border-b border-red-200">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center items-center py-12 flex-grow">
                  <Loader size={32} className="animate-spin text-teal-600" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-gray-500 py-8 flex-grow">
                  لا يوجد عناصر في هذه القائمة.
                </p>
              ) : (
                <div className="flex flex-col flex-grow">
                  {items.map((item, index) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      // Unique List Item Design (More prominent hover)
                      className="flex items-start gap-4 p-4 hover:bg-gray-100 transition-colors text-right border-b border-gray-100 last:border-b-0"
                    >
                      {/* 1. Thumbnail/Image (Larger for list) */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow-sm">
                        <img
                          src={item.imageUrl || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 2. Text Content */}
                      <div className="flex-grow min-w-0 flex flex-col text-right">
                        <div className="flex justify-between items-start">
                          {/* Item Name */}
                          <p className="font-semibold text-lg text-gray-900 truncate leading-tight">
                            {item.name}
                          </p>
                          {/* 3. Price/Status */}
                          <p className="text-xl font-extrabold text-teal-600 flex-shrink-0 mr-2">
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        {/* 4. Description Peek */}
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {item.description || "لا يوجد وصف متوفر لهذا العنصر."}
                        </p>

                        {/* 5. Item Type Badge with Lucid Icon */}
                        <div className="mt-2 text-xs font-medium text-gray-500 flex items-center gap-1">
                            {item.type === "product" ? (
                                <>
                                    <Package size={14} className="text-blue-500" /> 
                                    <span>منتج في المتجر</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={14} className="text-yellow-600" />
                                    <span>عرض خاص</span>
                                </>
                            )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default FeaturedListModal