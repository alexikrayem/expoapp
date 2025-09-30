// src/components/ProductFormModal.jsx - Enhanced with better validation and UX
import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Image as ImageIcon, AlertTriangle, Package, DollarSign, Tag, Hash } from 'lucide-react';

const ProductFormModal = ({ isOpen, onClose, onSave, productToEdit, isLoading: isSavingProduct }) => {
    const initialFormState = {
        name: '',
        standardized_name_input: '',
        description: '',
        price: '',
        discount_price: '',
        category: '',
        image_url: '',
        is_on_sale: false,
        stock_level: '0',
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
            if (productToEdit) {
                setFormData({
                    name: productToEdit.name || '',
                    standardized_name_input: productToEdit.standardized_name_input || '',
                    description: productToEdit.description || '',
                    price: productToEdit.price?.toString() || '',
                    discount_price: productToEdit.discount_price?.toString() || '',
                    category: productToEdit.category || '',
                    image_url: productToEdit.image_url || '',
                    is_on_sale: productToEdit.is_on_sale || false,
                    stock_level: productToEdit.stock_level?.toString() || '0',
                });
                setImagePreview(productToEdit.image_url || '');
            } else {
                setFormData(initialFormState);
                setImagePreview('');
            }
            setImageFile(null);
            setError('');
            setValidationErrors({});
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    }, [isOpen, productToEdit]);

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
        
        if (!formData.name.trim()) {
            errors.name = 'اسم المنتج مطلوب';
        }
        
        if (!formData.standardized_name_input.trim()) {
            errors.standardized_name_input = 'الاسم القياسي مطلوب';
        }
        
        if (!formData.price || parseFloat(formData.price) <= 0) {
            errors.price = 'السعر يجب أن يكون أكبر من صفر';
        }
        
        if (!formData.category.trim()) {
            errors.category = 'الفئة مطلوبة';
        }
        
        if (formData.discount_price && parseFloat(formData.discount_price) >= parseFloat(formData.price)) {
            errors.discount_price = 'سعر الخصم يجب أن يكون أقل من السعر الأصلي';
        }
        
        if (formData.stock_level && parseInt(formData.stock_level) < 0) {
            errors.stock_level = 'كمية المخزون لا يمكن أن تكون سالبة';
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
            console.error("Cloudinary credentials not configured");
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
                ...formData,
                image_url: finalImageUrl,
                price: parseFloat(formData.price),
                discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
                stock_level: parseInt(formData.stock_level) || 0,
                is_on_sale: Boolean(formData.is_on_sale),
            };

            await onSave(payload, productToEdit?.id);
        } catch (apiError) {
            setError(apiError.message || 'حدث خطأ أثناء حفظ المنتج.');
        }
    };

    if (!isOpen) return null;

    const isOverallLoading = isSavingProduct || isUploadingImage;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Package className="h-6 w-6 text-indigo-600" />
                        {productToEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
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
                    {/* Product Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">صورة المنتج</label>
                        <div className="flex flex-col items-center">
                            {imagePreview ? (
                                <div className="w-full h-48 mb-4 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50 shadow-sm">
                                    <img src={imagePreview} alt="معاينة المنتج" className="max-w-full max-h-full object-contain"/>
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
                                    className="flex-grow bg-white py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
                                <p className="text-sm text-indigo-600 mt-2 animate-pulse text-center flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                    جاري رفع الصورة...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Product Name */}
                    <div>
                        <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Package className="h-4 w-4 text-indigo-500" />
                            اسم المنتج (للعرض)
                        </label>
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="أدخل اسم المنتج كما سيظهر للعملاء"
                        />
                        {validationErrors.name && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
                        )}
                    </div>

                    {/* Standardized Name */}
                    <div>
                        <label htmlFor="standardized_name_input" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            الاسم القياسي للمنتج
                        </label>
                        <input 
                            type="text" 
                            name="standardized_name_input" 
                            id="standardized_name_input" 
                            value={formData.standardized_name_input} 
                            onChange={handleChange} 
                            required 
                            className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                validationErrors.standardized_name_input ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="الاسم الرسمي للمنتج من المصنع/العبوة"
                        />
                        {validationErrors.standardized_name_input && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.standardized_name_input}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            يستخدم للربط الآلي مع منتجات مشابهة من موردين آخرين
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            الوصف (اختياري)
                        </label>
                        <textarea 
                            name="description" 
                            id="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="3" 
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
                            placeholder="وصف مفصل للمنتج وفوائده"
                        />
                    </div>

                    {/* Price & Discount Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                السعر (د.إ)
                            </label>
                            <input 
                                type="number" 
                                name="price" 
                                id="price" 
                                value={formData.price} 
                                onChange={handleChange} 
                                required 
                                step="0.01" 
                                min="0" 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                    validationErrors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="0.00"
                            />
                            {validationErrors.price && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.price}</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="discount_price" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Tag className="h-4 w-4 text-orange-500" />
                                سعر الخصم (د.إ)
                            </label>
                            <input 
                                type="number" 
                                name="discount_price" 
                                id="discount_price" 
                                value={formData.discount_price} 
                                onChange={handleChange} 
                                step="0.01" 
                                min="0" 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                    validationErrors.discount_price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="اختياري"
                            />
                            {validationErrors.discount_price && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.discount_price}</p>
                            )}
                        </div>
                    </div>

                    {/* Category & Stock Level */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Tag className="h-4 w-4 text-purple-500" />
                                الفئة
                            </label>
                            <input 
                                type="text" 
                                name="category" 
                                id="category" 
                                value={formData.category} 
                                onChange={handleChange} 
                                required 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                    validationErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="مثل: أدوية، معدات طبية، مستلزمات"
                            />
                            {validationErrors.category && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.category}</p>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="stock_level" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                كمية المخزون
                            </label>
                            <input 
                                type="number" 
                                name="stock_level" 
                                id="stock_level" 
                                value={formData.stock_level} 
                                onChange={handleChange} 
                                min="0" 
                                step="1" 
                                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                                    validationErrors.stock_level ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                }`}
                                placeholder="0"
                            />
                            {validationErrors.stock_level && (
                                <p className="text-red-600 text-xs mt-1">{validationErrors.stock_level}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Is on Sale Checkbox */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                name="is_on_sale" 
                                id="is_on_sale" 
                                checked={formData.is_on_sale} 
                                onChange={handleChange} 
                                className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <label htmlFor="is_on_sale" className="text-sm font-medium text-orange-800">
                                هل هذا المنتج عليه تخفيض حالياً؟
                            </label>
                        </div>
                        {formData.is_on_sale && (
                            <p className="text-xs text-orange-700 mt-2">
                                تأكد من إدخال سعر الخصم أعلاه
                            </p>
                        )}
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
                            className="flex-1 px-6 py-3 text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isOverallLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    {isUploadingImage ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}
                                </>
                            ) : (
                                <>
                                    <Package className="h-5 w-5" />
                                    {productToEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormModal;