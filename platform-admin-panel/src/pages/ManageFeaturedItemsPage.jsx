// src/pages/ManageFeaturedItemsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Tag, PlusCircle, Edit3, Trash2, AlertCircle, Eye, EyeOff } from 'lucide-react'; // Added Eye, EyeOff
import FeaturedItemFormModal from '../components/FeaturedItemFormModal';
import { adminApiClient } from '../api/adminApiClient';


const ManageFeaturedItemsPage = () => {
    const [featuredItems, setFeaturedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // TODO: Add state for pagination if list becomes long

    const fetchFeaturedItemsDefinitions = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await adminApiClient.get('/api/admin/featured-items-definitions');
            setFeaturedItems(response.data.items || []); // Assuming { items: [...] }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch featured items.');
            setFeaturedItems([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeaturedItemsDefinitions();
    }, [fetchFeaturedItemsDefinitions]);

    const handleAddItem = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleEditItem = (item) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const handleSaveItem = async (itemData, featureDefinitionIdToEdit) => {
        setIsSubmitting(true);
        try {
            if (featureDefinitionIdToEdit) {
                await adminApiClient.put(`/api/admin/featured-items-definitions/${featureDefinitionIdToEdit}`, itemData);
            } else {
                await adminApiClient.post('/api/admin/featured-items', itemData);
            }
            setShowModal(false);
            fetchFeaturedItemsDefinitions(); // Refresh list
        } catch (err) {
            console.error("Save featured item error:", err);
            throw new Error(err.response?.data?.error || 'Failed to save.'); // Modal will catch and display
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (featureDefinitionId) => {
        if (window.confirm('Are you sure you want to remove this item from featured?')) {
            setIsLoading(true); // Can use general loading or a specific one
            try {
                await adminApiClient.delete(`/api/admin/featured-items-definitions/${featureDefinitionId}`);
                fetchFeaturedItemsDefinitions();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete featured item.');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    };


    if (isLoading && featuredItems.length === 0) {
        return <div className="flex justify-center items-center h-64"><p>Loading featured items...</p></div>;
    }
    // Error display and main return structure similar to ManageSuppliersPage...

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <Tag size={28} className="mr-3 text-teal-600" />
                    Manage Featured Items (Slider)
                </h2>
                <button
                    onClick={handleAddItem}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-md flex items-center"
                >
                    <PlusCircle size={20} className="mr-2" /> Add to Slider
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"><p>{error}</p></div>
            )}

            {featuredItems.length === 0 && !isLoading ? (
                 <div className="text-center py-10"><p>No items configured for the featured slider yet.</p></div>
            ) : (
                <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-right font-medium uppercase">Order</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Type</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Item ID</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Original Name / Custom Title</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Status</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Active From</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Active Until</th>
                                <th className="px-4 py-3 text-right font-medium uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {featuredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">{item.display_order}</td>
                                    <td className="px-4 py-3 whitespace-nowrap capitalize">{item.item_type}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{item.item_id}</td>
                                    <td className="px-4 py-3">
    {/* Use a fragment to group the two possible sibling elements */}
    <React.Fragment key={`title-${item.id}`}>
        {item.custom_title || item.original_item_name || <span className="italic text-gray-400">No Title</span>}
        {item.custom_title && item.original_item_name && (
            <span className="block text-xs text-gray-400">Original: {item.original_item_name}</span>
        )}
    </React.Fragment>
</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.active_from)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.active_until)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap space-x-2 space-x-reverse">
                                        <button onClick={() => handleEditItem(item)} className="text-indigo-600 hover:text-indigo-800 p-1"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <FeaturedItemFormModal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setEditingItem(null); }}
                    onSave={handleSaveItem}
                    itemToEdit={editingItem}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
export default ManageFeaturedItemsPage;