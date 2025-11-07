"use client"

import { useState, useEffect, useCallback } from "react"
import { Tag, PlusCircle, Edit3, Trash2 } from "lucide-react"
import FeaturedListFormModal from "../components/FeaturedListFormModal"
import { adminApiClient } from '../api/adminApiClient'

const ManageFeaturedListsPage = () => {
  const [featuredLists, setFeaturedLists] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchFeaturedLists = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const response = await adminApiClient.get("/api/admin/featured-lists")
      setFeaturedLists(response.data.items || [])
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch featured lists.")
      setFeaturedLists([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeaturedLists()
  }, [fetchFeaturedLists])

  const handleAddList = () => {
    setEditingList(null)
    setShowModal(true)
  }

  const handleEditList = (list) => {
    setEditingList(list)
    setShowModal(true)
  }

  const handleSaveList = async (listData, listIdToEdit) => {
    setIsSubmitting(true)
    try {
      if (listIdToEdit) {
        await adminApiClient.put(`/api/admin/featured-lists/${listIdToEdit}`, listData)
      } else {
        await adminApiClient.post("/api/admin/featured-lists", listData)
      }
      setShowModal(false)
      fetchFeaturedLists()
    } catch (err) {
      console.error("Save featured list error:", err)
      throw new Error(err.response?.data?.error || "Failed to save.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteList = async (listId) => {
    if (window.confirm("Are you sure you want to delete this list?")) {
      setIsLoading(true)
      try {
        await adminApiClient.delete(`/api/admin/featured-lists/${listId}`)
        fetchFeaturedLists()
      } catch (err) {
        alert(err.response?.data?.error || "Failed to delete featured list.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
  }

  if (isLoading && featuredLists.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading featured lists...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <Tag size={28} className="mr-3 text-teal-600" />
          Manage Featured Lists
        </h2>
        <button
          onClick={handleAddList}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md flex items-center"
        >
          <PlusCircle size={20} className="mr-2" /> Create New List
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {featuredLists.length === 0 && !isLoading ? (
        <div className="text-center py-10">
          <p>No featured lists created yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase">List Name</th>
                <th className="px-4 py-3 text-left font-medium uppercase">Type</th>
                <th className="px-4 py-3 text-left font-medium uppercase">Items Count</th>
                <th className="px-4 py-3 text-left font-medium uppercase">Status</th>
                <th className="px-4 py-3 text-left font-medium uppercase">Created</th>
                <th className="px-4 py-3 text-left font-medium uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {featuredLists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{list.list_name}</td>
                  <td className="px-4 py-3 capitalize">{list.list_type}</td>
                  <td className="px-4 py-3">{list.item_count || 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${list.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {list.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(list.created_at)}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleEditList(list)} className="text-indigo-600 hover:text-indigo-800 p-1">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteList(list.id)} className="text-red-600 hover:text-red-800 p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <FeaturedListFormModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingList(null)
          }}
          onSave={handleSaveList}
          listToEdit={editingList}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}

export default ManageFeaturedListsPage
