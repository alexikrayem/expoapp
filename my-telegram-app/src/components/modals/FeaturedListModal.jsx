"use client"

import { useState, useEffect } from "react"
import { X, Loader } from "lucide-react"
import axios from "axios"
import { useModal } from "../context/ModalContext"

const FeaturedListModal = ({ isOpen, onClose, list, onItemClick }) => {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const { openModal } = useModal()

  useEffect(() => {
    if (isOpen && list?.id) {
      fetchListItems()
    }
  }, [isOpen, list?.id])

  const fetchListItems = async () => {
    setIsLoading(true)
    setError("")
    try {
      const response = await axios.get(`/api/featured-items/list/${list.id}`)
      setItems(response.data || [])
    } catch (err) {
      console.error("Error fetching list items:", err)
      setError("Failed to load list items")
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
          city_id: item.city_id,
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
          city_id: item.city_id,
        },
      })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{list.title}</h2>
            <p className="text-teal-100 text-sm">{list.description}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-teal-800 p-1 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader size={32} className="animate-spin text-teal-600" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items in this list</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className="group relative h-48 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all"
                >
                  <img
                    src={item.imageUrl || "/placeholder.svg?height=200&width=200&query=product"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-end">
                    <div className="p-3 w-full">
                      <p className="text-white font-semibold text-sm line-clamp-2">{item.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FeaturedListModal
