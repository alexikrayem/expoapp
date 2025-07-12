// src/components/SupplierFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SupplierFormModal = ({ isOpen, onClose, onSave, supplierToEdit, isLoading }) => {
    const initialFormState = {
        name: '',
        email: '',
        password: '', // Only for Add mode, not typically shown/editable for Edit by admin
        category: '',
        location: '',
        rating: '', // Optional
        description: '', // Optional
        image_url: '', // Optional
        is_active: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');
    const isEditMode = !!supplierToEdit;

    useEffect(() => {
        if (supplierToEdit) {
            setFormData({
                name: supplierToEdit.name || '',
                email: supplierToEdit.email || '',
                password: '', // Password is not pre-filled for editing
                category: supplierToEdit.category || '',
                location: supplierToEdit.location || '',
                rating: supplierToEdit.rating || '',
                description: supplierToEdit.description || '',
                image_url: supplierToEdit.image_url || '',
                is_active: supplierToEdit.is_active === undefined ? true : Boolean(supplierToEdit.is_active),
            });
        } else {
            setFormData(initialFormState); // Reset for Add New
        }
        setError('');
    }, [isOpen, supplierToEdit]);

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

        if (!formData.name.trim() || !formData.email.trim() || !formData.category.trim()) {
            setError('Name, Email, and Category are required.');
            return;
        }
        if (!isEditMode && !formData.password.trim()) { // Password required only for Add mode
            setError('Password is required for new suppliers.');
            return;
        }
        if (!isEditMode && formData.password.trim().length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        // Add other validations (email format, rating is number etc.)

        const payload = {
            name: formData.name.trim(),
            email: formData.email.toLowerCase().trim(),
            category: formData.category.trim(),
            location: formData.location?.trim() || null,
            rating: formData.rating ? parseFloat(formData.rating) : null,
            description: formData.description?.trim() || null,
            image_url: formData.image_url?.trim() || null,
            is_active: Boolean(formData.is_active),
        };

        if (!isEditMode) {
            payload.password = formData.password; // Only send password for new suppliers
        }

        try {
            await onSave(payload, supplierToEdit?.id); // onSave handles POST or PUT
        } catch (apiError) {
            setError(apiError.message || 'An error occurred.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {isEditMode ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                        <X size={22} />
                    </button>
                </div>

                {error && <p className="bg-red-100 border-red-300 text-red-700 px-4 py-2.5 rounded-md mb-4 text-sm">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="s_name" className="block text-sm font-medium text-gray-700 mb-1">اسم المورد</label>
                        <input type="text" name="name" id="s_name" value={formData.name} onChange={handleChange} required className="form-input"/>
                    </div>
                    <div>
                        <label htmlFor="s_email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <input type="email" name="email" id="s_email" value={formData.email} onChange={handleChange} required className="form-input"/>
                    </div>
                    {!isEditMode && ( // Only show password field for Add mode
                        <div>
                            <label htmlFor="s_password" className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور (الأولية)</label>
                            <input type="password" name="password" id="s_password" value={formData.password} onChange={handleChange} required={!isEditMode} className="form-input"/>
                        </div>
                    )}
                     <div>
                        <label htmlFor="s_category" className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                        <input type="text" name="category" id="s_category" value={formData.category} onChange={handleChange} required className="form-input"/>
                    </div>
                    <div>
                        <label htmlFor="s_location" className="block text-sm font-medium text-gray-700 mb-1">الموقع (اختياري)</label>
                        <input type="text" name="location" id="s_location" value={formData.location} onChange={handleChange} className="form-input"/>
                    </div>
                    <div>
                        <label htmlFor="s_rating" className="block text-sm font-medium text-gray-700 mb-1">التقييم (اختياري, 0-5)</label>
                        <input type="number" name="rating" id="s_rating" value={formData.rating} onChange={handleChange} step="0.1" min="0" max="5" className="form-input"/>
                    </div>
                     <div>
                        <label htmlFor="s_image_url" className="block text-sm font-medium text-gray-700 mb-1">رابط صورة الشعار (اختياري)</label>
                        <input type="url" name="image_url" id="s_image_url" value={formData.image_url} onChange={handleChange} className="form-input"/>
                    </div>
                    <div>
                        <label htmlFor="s_description" className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                        <textarea name="description" id="s_description" value={formData.description} onChange={handleChange} rows="3" className="form-textarea"></textarea>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="is_active" id="s_is_active" checked={formData.is_active} onChange={handleChange} className="form-checkbox"/>
                        <label htmlFor="s_is_active" className="ml-2 block text-sm text-gray-800">فعال؟</label> {/* mr-2 for RTL */}
                    </div>

                    <div className="pt-5 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700 disabled:opacity-50"
                        >
                            {isLoading ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التعديلات' : 'إضافة المورد')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierFormModal;