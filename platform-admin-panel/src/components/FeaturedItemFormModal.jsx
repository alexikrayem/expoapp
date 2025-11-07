"use client"

import React, { useState, useEffect } from "react"
import axios from "axios"
import { X, Loader, ImageIcon, Search, AlertTriangle } from "lucide-react"

const miniAppApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
})

const FeaturedItemFormModal = ({ isOpen, onClose, onSave, itemToEdit, isLoading, cityId }) => {
  const initialFormState = {
    item_type: "product",
    item_id: "",
    display_order: 0,
    custom_title: "",
    custom_description: "",
    custom_image_url: "",
    is_active: true,
    active_from: "",
    active_until: "",
  }

  const [formData, setFormData] = useState(initialFormState)
  const [error, setError] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchTimeout, setSearchTimeout] = useState(null)

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        item_type: itemToEdit.item_type || "product",
        item_id: itemToEdit.item_id || "",
        display_order: itemToEdit.display_order || 0,
        custom_title: itemToEdit.custom_title || "",
        custom_description: itemToEdit.custom_description || "",
        custom_image_url: itemToEdit.custom_image_url || "",
        is_active: itemToEdit.is_active !== false,
        active_from: itemToEdit.active_from ? new Date(itemToEdit.active_from).toISOString().substring(0, 16) : "",
        active_until: itemToEdit.active_until ? new Date(itemToEdit.active_until).toISOString().substring(0, 16) : "",
      })
      setSelectedItem(null)
    } else {
      setFormData(initialFormState)
      setSelectedItem(null)
    }
    setError("")
  }, [isOpen, itemToEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  // 🔍 Debounced search
  const handleSearchChange = (term) => {
    setSearchTerm(term)
    setError("")

    if (searchTimeout) clearTimeout(searchTimeout)

    if (term.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timeout = setTimeout(() => performSearch(term), 300)
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

      const results = response.data.results || {}

      let items = []
      if (formData.item_type === "product") {
        items = results.products?.items?.map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          supplier_name: p.supplier_name,
        })) || []
      } else if (formData.item_type === "deal") {
        items = results.deals?.map((d) => ({
          id: d.id,
          name: d.title,
          image_url: d.image_url,
          supplier_name: d.supplier_name,
        })) || []
      } else if (formData.item_type === "supplier") {
        items = results.suppliers?.map((s) => ({
          id: s.id,
          name: s.name,
          image_url: s.image_url,
        })) || []
      }

      setSearchResults(items)
    } catch (err) {
      console.error("Search error:", err)
      setError("Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectItem = (item) => {
    setSelectedItem(item)
    setFormData((prev) => ({
      ...prev,
      item_id: item.id,
      custom_title: prev.custom_title || item.name,
      custom_image_url: prev.custom_image_url || item.image_url || "",
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.item_id) {
      setError("Please select an item before saving.")
      return
    }

    const payload = {
      ...formData,
      item_id: parseInt(formData.item_id, 10),
      display_order: parseInt(formData.display_order, 10) || 0,
      active_from: formData.active_from || null,
      active_until: formData.active_until || null,
    }

    try {
      await onSave(payload, itemToEdit?.feature_definition_id)
    } catch (apiError) {
      setError(apiError.message || "An error occurred.")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-semibold">
            {itemToEdit ? "Edit Featured Item" : "Add New Featured Item"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 flex items-center gap-2 text-sm">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={(e) => {
                handleChange(e)
                setSearchResults([])
                setSearchTerm("")
                setSelectedItem(null)
              }}
              className="w-full border-gray-300 rounded-md p-2"
            >
              <option value="product">Product</option>
              <option value="deal">Deal</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>

          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search {formData.item_type.charAt(0).toUpperCase() + formData.item_type.slice(1)}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={`Search ${formData.item_type}s...`}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              />
              {isSearching && (
                <Loader size={16} className="absolute right-3 top-2.5 animate-spin text-teal-500" />
              )}
            </div>

            {/* Results */}
            <div className="border border-gray-200 rounded-md p-3 mt-3 max-h-48 overflow-y-auto">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader size={24} className="animate-spin text-gray-400" />
                </div>
              ) : searchTerm.trim().length < 2 ? (
                <p className="text-center text-gray-400 text-sm py-6">
                  Type at least 2 characters to search
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No results found</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {searchResults.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`relative border rounded-lg p-2 text-left transition ${
                        selectedItem?.id === item.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-teal-300"
                      }`}
                    >
                      <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden mb-2">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="text-gray-300 w-8 h-8" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 line-clamp-2">{item.name}</p>
                      {item.supplier_name && (
                        <p className="text-xs text-gray-500">{item.supplier_name}</p>
                      )}
                      {selectedItem?.id === item.id && (
                        <div className="absolute top-1 right-1 bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional Customization Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Custom Title</label>
            <input
              type="text"
              name="custom_title"
              value={formData.custom_title}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md p-2"
              placeholder="Optional override title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Custom Description</label>
            <textarea
              name="custom_description"
              value={formData.custom_description}
              onChange={handleChange}
              rows="2"
              className="w-full border-gray-300 rounded-md p-2"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Display Order</label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md p-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-teal-600 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader size={16} className="animate-spin" />}
              {itemToEdit ? "Update Item" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FeaturedItemFormModal
