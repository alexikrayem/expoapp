// src/components/DealFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DealFormModal = ({ isOpen, onClose, onSave, dealToEdit, supplierProducts = [], isLoading }) => {
    const initialFormState = {
        title: '',
        description: '',
        discount_percentage: '', // Keep as string for input, parse on save
        start_date: '',
        end_date: '',
        product_id: '', // Will be string from select, parse on save
        image_url: '',
        is_active: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');

    useEffect(() => {
        if (dealToEdit) {
            setFormData({
                title: dealToEdit.title || '',
                description: dealToEdit.description || '',
                discount_percentage: dealToEdit.discount_percentage || '',
                start_date: dealToEdit.start_date ? new Date(dealToEdit.start_date).toISOString().split('T')[0] : '',
                end_date: dealToEdit.end_date ? new Date(dealToEdit.end_date).toISOString().split('T')[0] : '',
                product_id: dealToEdit.product_id || '',
                image_url: dealToEdit.image_url || '',
                is_active: dealToEdit.is_active === undefined ? true : dealToEdit.is_active,
            });
        } else {
            setFormData(initialFormState);
        }
        setError('');
    }, [isOpen, dealToEdit]);

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

        if (!formData.title.trim()) {
            setError('Deal title is required.');
            return;
        }
        // Add more frontend validation as per backend (discount, dates)

        const payload = {
            ...formData,
            discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
            product_id: formData.product_id ? parseInt(formData.product_id) : null,
            // Dates will be sent as YYYY-MM-DD strings, backend handles conversion
        };
        
        // Remove empty strings for optional fields so backend uses NULL
        if (!payload.description) delete payload.description;
        if (!payload.start_date) delete payload.start_date;
        if (!payload.end_date) delete payload.end_date;
        if (!payload.image_url) delete payload.image_url;
        if (payload.discount_percentage === null) delete payload.discount_percentage;


        try {
            await onSave(payload, dealToEdit?.id);
        } catch (apiError) {
            setError(apiError.message || 'An error occurred while saving the deal.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-xl font-semibold text-gray-700">
                        {dealToEdit ? 'تعديل العرض' : 'إضافة عرض جديد'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">عنوان العرض</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 input-class" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">الوصف</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" className="mt-1 input-class"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700">نسبة الخصم (%) <span className="text-xs">(اختياري)</span></label>
                            <input type="number" name="discount_percentage" id="discount_percentage" value={formData.discount_percentage} onChange={handleChange} step="0.01" min="0" max="100" className="mt-1 input-class" />
                        </div>
                        <div>
                            <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">المنتج المرتبط <span className="text-xs">(اختياري)</span></label>
                            <select name="product_id" id="product_id" value={formData.product_id} onChange={handleChange} className="mt-1 input-class">
                                <option value="">-- لا يوجد منتج محدد --</option>
                                {supplierProducts.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">تاريخ البدء <span className="text-xs">(اختياري)</span></label>
                            <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 input-class" />
                        </div>
                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">تاريخ الانتهاء <span className="text-xs">(اختياري)</span></label>
                            <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 input-class" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">رابط صورة العرض <span className="text-xs">(اختياري)</span></label>
                        <input type="url" name="image_url" id="image_url" value={formData.image_url} onChange={handleChange} className="mt-1 input-class" />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="is_active" id="is_active_deal" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="is_active_deal" className="ml-2 block text-sm text-gray-900">فعال؟</label> {/* mr-2 for RTL */}
                    </div>
                    <style jsx>{`
                        .input-class {
                            display: block;
                            width: 100%;
                            padding: 0.5rem 0.75rem;
                            border-width: 1px;
                            border-color: #D1D5DB; /* gray-300 */
                            border-radius: 0.375rem; /* rounded-md */
                            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                        }
                        .input-class:focus {
                            outline: none;
                            --tw-ring-color: #6366F1; /* indigo-500 */
                            border-color: #6366F1; /* indigo-500 */
                            box-shadow: 0 0 0 3px var(--tw-ring-color); /* focus:ring-2 focus:ring-offset-0 */
                        }
                    `}</style>
                    <div className="pt-5 flex justify-end space-x-3 space-x-reverse">
                        <button type="button" onClick={onClose} disabled={isLoading} className="btn-secondary">إلغاء</button>
                        <button type="submit" disabled={isLoading} className="btn-primary">
                            {isLoading ? 'جاري الحفظ...' : (dealToEdit ? 'حفظ التعديلات' : 'إضافة العرض')}
                        </button>
                    </div>
                     {/* Basic button styling (can be expanded or put in index.css) */}
                    <style jsx>{`
                        .btn-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; }
                        .btn-primary:hover { background-color: #4338ca; }
                        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                        .btn-secondary { background-color: white; color: #374151; border: 1px solid #D1D5DB; padding: 0.5rem 1rem; border-radius: 0.375rem; }
                        .btn-secondary:hover { background-color: #F9FAFB; }
                        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
                    `}</style>
                </form>
            </div>
        </div>
    );
};

export default DealFormModal;