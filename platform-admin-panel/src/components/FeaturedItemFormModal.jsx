// src/components/FeaturedItemFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FeaturedItemFormModal = ({ isOpen, onClose, onSave, itemToEdit, isLoading }) => {
    const initialFormState = {
        item_type: 'product', // Default
        item_id: '',
        display_order: 0,
        custom_title: '',
        custom_description: '',
        custom_image_url: '',
        is_active: true,
        active_from: '',
        active_until: '',
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                item_type: itemToEdit.item_type || 'product',
                item_id: itemToEdit.item_id || '',
                display_order: itemToEdit.display_order || 0,
                custom_title: itemToEdit.custom_title || '',
                custom_description: itemToEdit.custom_description || '',
                custom_image_url: itemToEdit.custom_image_url || '',
                is_active: itemToEdit.is_active === undefined ? true : Boolean(itemToEdit.is_active),
                active_from: itemToEdit.active_from ? new Date(itemToEdit.active_from).toISOString().substring(0, 16) : '', // For datetime-local input
                active_until: itemToEdit.active_until ? new Date(itemToEdit.active_until).toISOString().substring(0, 16) : '',
            });
        } else {
            setFormData(initialFormState);
        }
        setError('');
    }, [isOpen, itemToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!formData.item_id) {
            setError('Item ID is required.');
            return;
        }
        // Convert empty strings for dates to null for the backend
        const payload = {
            ...formData,
            item_id: parseInt(formData.item_id, 10),
            display_order: parseInt(formData.display_order, 10) || 0,
            active_from: formData.active_from || null,
            active_until: formData.active_until || null,
        };
        try {
            await onSave(payload, itemToEdit?.feature_definition_id);
        } catch (apiError) {
            setError(apiError.message || 'An error occurred.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4" dir="rtl"> {/* Higher z-index */}
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-xl font-semibold text-gray-700">
                        {itemToEdit ? 'Edit Featured Item' : 'Add New Featured Item'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="item_type" className="block font-medium text-gray-700">Item Type</label>
                            <select name="item_type" id="item_type" value={formData.item_type} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="product">Product</option>
                                <option value="deal">Deal</option>
                                <option value="supplier">Supplier</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="item_id" className="block font-medium text-gray-700">Item ID (Product/Deal/Supplier ID)</label>
                            <input type="number" name="item_id" id="item_id" value={formData.item_id} onChange={handleChange} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="display_order" className="block font-medium text-gray-700">Display Order</label>
                        <input type="number" name="display_order" id="display_order" value={formData.display_order} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="custom_title" className="block font-medium text-gray-700">Custom Title (Optional - overrides original)</label>
                        <input type="text" name="custom_title" id="custom_title" value={formData.custom_title} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="custom_description" className="block font-medium text-gray-700">Custom Description (Optional)</label>
                        <textarea name="custom_description" id="custom_description" value={formData.custom_description} onChange={handleChange} rows="2" className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"></textarea>
                    </div>
                    <div>
                        <label htmlFor="custom_image_url" className="block font-medium text-gray-700">Custom Image URL (Optional)</label>
                        <input type="url" name="custom_image_url" id="custom_image_url" value={formData.custom_image_url} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="active_from" className="block font-medium text-gray-700">Active From (Optional)</label>
                            <input type="datetime-local" name="active_from" id="active_from" value={formData.active_from} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div>
                            <label htmlFor="active_until" className="block font-medium text-gray-700">Active Until (Optional)</label>
                            <input type="datetime-local" name="active_until" id="active_until" value={formData.active_until} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                        <label htmlFor="is_active" className="ml-2 block font-medium text-gray-900">Is Active?</label> {/* mr-2 for RTL */}
                    </div>
                    <div className="pt-5 flex justify-end space-x-3 space-x-reverse">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">{isLoading ? 'Saving...' : 'Save Featured Item'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default FeaturedItemFormModal;
