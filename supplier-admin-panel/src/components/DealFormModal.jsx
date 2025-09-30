// src/components/DealFormModal.jsx - Enhanced deal form with better validation
import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Calendar, Percent, Package, UploadCloud, Image as ImageIcon, AlertTriangle } from 'lucide-react';

const DealFormModal = ({ isOpen, onClose, onSave, dealToEdit, supplierProducts = [], isLoading }) => {
    const initialFormState = {
        title: '',
        description: '',
        discount_percentage: '',
        start_date: '',
        end_date: '',
        product_id: '',
        image_url: '',
        is_active: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    // Cloudinary configuration
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    useEffect(() => {
        if (isOpen) {
            if (dealToEdit) {
                setFormData({
                    title: dealToEdit.title || '',
                    description: dealToEdit.description || '',
                    discount_percentage: dealToEdit.discount_percentage?.toString() || '',
                    start_date: dealToEdit.start_date ? new Date(dealToEdit.start_date).toISOString().split('T')[0] : '',
                    end_date: dealToEdit.end_date ? new Date(dealToEdit.end_date).toISOString().split('T')[0] : '',
                    product_id: dealToEdit.product_id?.toString() || '',
                    image_url: dealToEdit.image_url || '',
                    is_active: dealToEdit.is_active === undefined ? true : dealToEdit.is_active,
                });
                setImagePreview(dealToEdit.image_url || '');
            } else {
                setFormData(initialFormState);
                setImagePreview('');
            }
            setImageFile(null);
            setError('');
            setValidationErrors({});
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    }, [isOpen, dealToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        
        // Clear validation error for this field
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.title.trim()) {
            errors.title = 'عنوان العرض مطلوب';
        }
        
        if (formData.discount_percentage && (parseFloat(formData.discount_percentage) <= 0 || parseFloat(formData.discount_percentage) > 100)) {
            errors.discount_percentage = 'نسبة الخصم يجب أن تكون بين 1 و 100';
        }
        
        if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
            errors.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleImageFileChange = (e) => {
        const file = e.target.files[0];
        setError('');

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('ملف الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');
                setImageFile(null);
                setImagePreview(formData.image_url || '');
                e.target.value = null;
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
                setError('نوع ملف الصورة غير صالح (المسموح به: JPG, PNG, WEBP, GIF).');
                setImageFile(null);
                setImagePreview(formData.image_url || '');
                e.target.value = null;
                return;
            }
            
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImageToCloudinary = async () => {
        if (!imageFile) return formData.image_url || null;

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            throw new Error("خدمة رفع الصور غير مهيأة بشكل صحيح.");
        }

        setIsUploadingImage(true);
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', imageFile);
        cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: cloudinaryFormData,
            });
            const data = await response.json();
            if (data.secure_url) {
                return data.secure_url;
            } else {
                throw new Error(data.error?.message || 'فشل رفع الصورة.');
            }
        } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) {
            return;
        }

        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) {
                finalImageUrl = await uploadImageToCloudinary();
            }

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                product_id: formData.product_id ? parseInt(formData.product_id) : null,
                image_url: finalImageUrl,
                is_active: Boolean(formData.is_active),
            };

            await onSave(payload, dealToEdit?.id);
        } catch (apiError) {
            setError(apiError.message || 'حدث خطأ أثناء حفظ العرض.');
        }
    };

    if (!isOpen) return null;

    const isOverallLoading = isLoading || isUploadingImage;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Tag className="h-6 w-6 text-orange-600" />
                        {dealToEdit ? 'تعديل العرض' : 'إضافة عرض جديد'}
                    </h3>
                    <button 
                        onClick={onClose} 
                        disabled={isOverallLoading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Deal Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">صورة العرض</label>
                        <div className="flex flex-col items-center">
                            {imagePreview ? (
                                <div className="w-full h-48 mb-4 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50 shadow-sm">
                                    <img src={imagePreview} alt="معاينة العرض" className="max-w-full max-h-full object-contain"/>
                                </div>
                            ) : (
                                <div className="w-full h-48 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <ImageIcon size={48} className="mb-3 opacity-70" />
                                    <span className="text-sm">لم يتم اختيار صورة</span>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isOverallLoading}
                                    className="flex-grow bg-white py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <UploadCloud size={18} />
                                    {imageFile ? 'تغيير الصورة' : 'رفع صورة'}
                                </button>
                                
                                {imagePreview && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview('');
                                            setFormData(prev => ({...prev, image_url: ''}));
                                            if (fileInputRef.current) fileInputRef.current.value = null;
                                        }} 
                                        className="text-sm text-red-600 hover:text-red-800 px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                        disabled={isOverallLoading}
                                    >
                                        مسح
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
                                <p className="text-sm text-orange-600 mt-2 animate-pulse text-center flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                                    جاري رفع الصورة...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Deal Title */}
                    <div>
                        <label htmlFor="title" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Tag className="h-4 w-4 text-orange-500" />
                            عنوان العرض
                        </label>
                        <input 
                            type="text" 
                            name="title" 
                            id="title" 
                            value={formData.title} 
                            onChange={handleChange} 
                            required 
                            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                                validationErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="أدخل عنوان جذاب للعرض"
                        />
                        {validationErrors.title && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.title}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            وصف العرض
                        </label>
                        <textarea 
                            name="description" 
                            id="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="3" 
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors"
                            placeholder="اكتب وصفاً مفصلاً للعرض وشروطه"
                        />
                    </div>

                    {/* Discount Percentage and Product */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="discount_percentage" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Percent className="h-4 w-4 text-red-500" />
                                نسبة الخصم (%)
                            </label>
                            <input 
                                type="number" 
                                name="discount_percentage" 
                                id="discount_percentage" 
                                value={formData.discount_percentage} 
                                onChange={handleChange} 
                                step="0.01" 
                                min="0" 
                                max="100" 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                                    validationErrors.discount_percentage ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="20"
                            />
                            {validationErrors.discount_percentage && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.discount_percentage}</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="product_id" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                المنتج المرتبط
                            </label>
                            <select 
                                name="product_id" 
                                id="product_id" 
                                value={formData.product_id} 
                                onChange={handleChange} 
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                            >
                                <option value="">-- عرض عام (غير مرتبط بمنتج محدد) --</option>
                                {supplierProducts.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                اختياري - ربط العرض بمنتج محدد
                            </p>
                        </div>
                    </div>

                    {/* Start and End Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 text-green-500" />
                                تاريخ البدء
                            </label>
                            <input 
                                type="date" 
                                name="start_date" 
                                id="start_date" 
                                value={formData.start_date} 
                                onChange={handleChange} 
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                اختياري - اتركه فارغاً للبدء فوراً
                            </p>
                        </div>
                        
                        <div>
                            <label htmlFor="end_date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 text-red-500" />
                                تاريخ الانتهاء
                            </label>
                            <input 
                                type="date" 
                                name="end_date" 
                                id="end_date" 
                                value={formData.end_date} 
                                onChange={handleChange} 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                                    validationErrors.end_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                            />
                            {validationErrors.end_date && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.end_date}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                اختياري - اتركه فارغاً للعرض المفتوح
                            </p>
                        </div>
                    </div>
                    
                    {/* Is Active Checkbox */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                name="is_active" 
                                id="is_active" 
                                checked={formData.is_active} 
                                onChange={handleChange} 
                                className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-green-800">
                                عرض نشط (مرئي للعملاء)
                            </label>
                        </div>
                        <p className="text-xs text-green-700 mt-2">
                            يمكنك إلغاء تفعيل العرض مؤقتاً دون حذفه
                        </p>
                    </div>

                    {/* Submit/Cancel Buttons */}
                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isOverallLoading}
                            className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isOverallLoading}
                            className="flex-1 px-6 py-3 text-white bg-orange-600 border border-transparent rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isOverallLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    {isUploadingImage ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}
                                </>
                            ) : (
                                <>
                                    <Tag className="h-5 w-5" />
                                    {dealToEdit ? 'حفظ التعديلات' : 'إضافة العرض'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DealFormModal;