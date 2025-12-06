"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { X, Loader, UploadCloud, ImageIcon, AlertTriangle, Search } from "lucide-react"
import { adminApiClient } from '../api/adminApiClient'

const miniAppApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
})

const FeaturedListFormModal = ({ isOpen, onClose, onSave, listToEdit, isLoading, cityId }) => {
  const [formData, setFormData] = useState({
    list_name: "",
    list_type: "products",
    description: "",
    custom_image_url: "",
    is_active: true,
    display_order: 0,
    items: [],
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  const [selectedItems, setSelectedItems] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("products")
  const [searchResults, setSearchResults] = useState({
    products: { items: [], totalItems: 0 },
    deals: [],
    suppliers: [],
  })
  const [error, setError] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)

  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  useEffect(() => {
    if (listToEdit) {
      setFormData({
        list_name: listToEdit.list_name || "",
        list_type: listToEdit.list_type || "products",
        description: listToEdit.description || "",
        custom_image_url: listToEdit.custom_image_url || "",
        is_active: listToEdit.is_active !== false,
        display_order: listToEdit.display_order || 0,
        items: [],
      })

      setImagePreview(listToEdit.custom_image_url || "")

      if (listToEdit.id) {
        fetchListItems(listToEdit.id)
      }
    } else {
      setImageFile(null)
      setImagePreview("")
      setSelectedItems([])
      setSearchTerm("")
      setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] })
    }
  }, [listToEdit, isOpen])

  const handleSearchChange = (term) => {
    setSearchTerm(term)
    setError("")

    if (searchTimeout) clearTimeout(searchTimeout)

    if (term.trim().length < 2) {
      setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] })
      return
    }

    const timeout = setTimeout(async () => {
      await performSearch(term)
    }, 300)

    setSearchTimeout(timeout)
  }

  const performSearch = async (term) => {
    setIsSearching(true)
    try {
      const response = await miniAppApiClient.get("/api/search", {
        params: {
          searchTerm: term,
          cityId: cityId || "1",
          limit: 20,
        },
      })

      const results = response.data.results || { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] }

      setSearchResults({
        products: {
          items: (results.products?.items || []).map((p) => ({
            id: p.id,
            type: "product",
            name: p.name,
            image_url: p.image_url || "",
            supplier_name: p.supplier_name,
          })),
          totalItems: results.products?.totalItems || 0,
        },
        deals: (results.deals || []).map((d) => ({
          id: d.id,
          type: "deal",
          name: d.title,
          image_url: d.image_url || "",
          supplier_name: d.supplier_name,
        })),
        suppliers: results.suppliers || [],
      })
    } catch (err) {
      console.error("Error performing search:", err)
      setError("Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const fetchListItems = async (listId) => {
    try {
      const response = await adminApiClient.get(`/api/admin/featured-lists/${listId}`)
      const listItems = response.data.items || []
      setSelectedItems(
        listItems.map((item) => ({
          id: item.item_id,
          type: item.item_type,
          name: item.item_name,
          image_url: item.item_image_url,
        })),
      )
    } catch (err) {
      console.error("Error fetching list items:", err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "display_order" ? Number.parseInt(value) : value,
    }))
  }

  const handleAddItem = (item) => {
    if (!selectedItems.find((si) => si.id === item.id && si.type === item.type)) {
      setSelectedItems((prev) => [...prev, item])
    }
  }

  const handleRemoveItem = (itemId) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    setError("")

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image file is too large (maximum 5 MB).")
        setImageFile(null)
        setImagePreview(formData.custom_image_url || "")
        e.target.value = null
        return
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        setError("Invalid image file type (Allowed: JPG, PNG, WEBP, GIF).")
        setImageFile(null)
        setImagePreview(formData.custom_image_url || "")
        e.target.value = null
        return
      }

      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return formData.custom_image_url || null

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      console.error("Cloudinary credentials not configured")
      throw new Error("Image upload service is not properly configured.")
    }

    setIsUploadingImage(true)
    const cloudinaryFormData = new FormData()
    cloudinaryFormData.append("file", imageFile)
    cloudinaryFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: cloudinaryFormData,
      })
      const data = await response.json()
      if (data.secure_url) {
        return data.secure_url
      } else {
        throw new Error(data.error?.message || "Failed to upload image.")
      }
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError)
      throw uploadError
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    try {
      if (!formData.list_name.trim()) {
        setError("List name is required")
        return
      }

      if (selectedItems.length === 0) {
        setError("Please add at least one item to the list")
        return
      }

      let finalImageUrl = formData.custom_image_url
      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary()
      }

      const submitData = {
        ...formData,
        custom_image_url: finalImageUrl,
        items: selectedItems.map((item, index) => ({
          item_type: item.type,
          item_id: item.id,
        })),
      }

      await onSave(submitData, listToEdit?.id)
    } catch (err) {
      setError(err.message || "Failed to save list")
    }
  }

  const isOverallLoading = isLoading || isUploadingImage

  const currentResults = activeTab === "products" ? searchResults.products.items : searchResults.deals

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{listToEdit ? "Edit Featured List" : "Create Featured List"}</h3>
          <button onClick={onClose} disabled={isOverallLoading} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">List Image (Slider Card)</label>
            <div className="flex flex-col items-center">
              {imagePreview ? (
                <div className="w-full h-32 mb-3 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Image preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-32 mb-3 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <ImageIcon size={32} className="mb-2 opacity-70" />
                  <span className="text-xs">No image selected</span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOverallLoading}
                  className="flex-grow bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UploadCloud size={16} />
                  {imageFile ? "Change Image" : "Upload Image"}
                </button>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview("")
                      setFormData((prev) => ({ ...prev, custom_image_url: "" }))
                      if (fileInputRef.current) fileInputRef.current.value = null
                    }}
                    className="text-xs text-red-600 hover:text-red-800 px-3 py-2 border border-red-300 rounded-md hover:bg-red-50"
                    disabled={isOverallLoading}
                  >
                    Clear
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleImageFileChange}
              />

              {isUploadingImage && (
                <p className="text-xs text-teal-600 mt-2 animate-pulse text-center">Uploading image...</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List Name *</label>
              <input
                type="text"
                name="list_name"
                value={formData.list_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    list_name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Summer Deals"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">List Type *</label>
              <select
                name="list_type"
                value={formData.list_type}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    list_type: e.target.value,
                  }))
                  setActiveTab(e.target.value === "deals" ? "deals" : "products")
                  setSearchTerm("")
                  setSearchResults({ products: { items: [], totalItems: 0 }, deals: [], suppliers: [] })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="products">Products</option>
                <option value="deals">Deals</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Optional description for this list"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_order: Number.parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Search & Selection Section */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              Select {formData.list_type === "products" ? "Products" : "Deals"}
            </h4>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${formData.list_type === "products" ? "products" : "deals"}...`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {isSearching && <Loader size={16} className="absolute right-3 top-2.5 animate-spin text-teal-500" />}
            </div>

            <div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader size={24} className="animate-spin text-gray-400" />
                </div>
              ) : searchTerm.trim().length < 2 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Type at least 2 characters to search</p>
                </div>
              ) : currentResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No matching items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentResults.map((item) => {
                    const isSelected = selectedItems.find((si) => si.id === item.id && si.type === item.type)
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => handleAddItem(item)}
                        disabled={isSelected}
                        className={`relative p-3 rounded-lg border-2  overflow-hidden group ${
                          isSelected
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 hover:border-teal-300 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          )}
                        </div>

                        <p className="text-xs font-medium text-gray-700 line-clamp-2">{item.name}</p>
                        {item.supplier_name && <p className="text-xs text-gray-500">{item.supplier_name}</p>}

                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <span className="text-sm font-bold">✓</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Items Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Items ({selectedItems.length})</h4>
            {selectedItems.length === 0 ? (
              <p className="text-xs text-gray-500">No items selected yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="relative bg-white border border-gray-200 rounded-lg p-2 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="h-12 bg-gray-100 rounded mb-1 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url || "/placeholder.svg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{item.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isOverallLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isOverallLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isOverallLoading && <Loader size={16} className="animate-spin" />}
              {listToEdit ? "Update List" : "Create List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FeaturedListFormModal
