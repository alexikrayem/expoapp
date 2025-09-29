// src/components/SupplierFormModal.jsx - Enhanced with image upload
import React, { useState, useEffect, useRef } from 'react';
import { X, CloudUpload as UploadCloud, Image as ImageIcon, TriangleAlert as AlertTriangle, User, Mail, MapPin, Tag } from 'lucide-react';

const SupplierFormModal = ({ isOpen, onClose, onSave, supplierToEdit, isLoading }) => {
    const initialFormState = {
        name: '',
        email: '',
        password: '',
        category: '',
        location: '',
        rating: '',
        description: '',
        image_url: '',
        is_active: true,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
    const isEditMode = !!supplierToEdit;

    // Cloudinary configuration (add these to your .env file)
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    useEffect(() => {
        if (isOpen) {
            if (supplierToEdit) {
                setFormData({
                    name: supplierToEdit.name || '',
                    email: supplierToEdit.email || '',
                    password: '',
                    category: supplierToEdit.category || '',
                    location: supplierToEdit.location || '',
                    rating: supplierToEdit.rating?.toString() || '',
                    description: supplierToEdit.description || '',
                    image_url: supplierToEdit.image_url || '',
                    is_active: supplierToEdit.is_active !== undefined ? supplierToEdit.is_active : true,
                });
                setImagePreview(supplierToEdit.image_url || '');
            } else {
                setFormData(initialFormState);
                setImagePreview('');
            }
            setImageFile(null);
            setError('');
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    }, [isOpen, supplierToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
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

        if (!formData.name.trim() || !formData.email.trim() || !formData.category.trim()) {
            setError('الاسم والبريد الإلكتروني والفئة حقول مطلوبة.');
            return;
        }
        if (!isEditMode && !formData.password.trim()) {
            setError('كلمة المرور مطلوبة للموردين الجدد.');
            return;
        }
        if (!isEditMode && formData.password.trim().length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
            return;
        }

        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) {
                finalImageUrl = await uploadImageToCloudinary();
            }

            const payload = {
                name: formData.name.trim(),
                email: formData.email.toLowerCase().trim(),
                category: formData.category.trim(),
                location: formData.location?.trim() || null,
                rating: formData.rating ? parseFloat(formData.rating) : null,
                description: formData.description?.trim() || null,
                image_url: finalImageUrl,
                is_active: Boolean(formData.is_active),
            };

            if (!isEditMode) {
                payload.password = formData.password;
            }

            await onSave(payload, supplierToEdit?.id);
        } catch (apiError) {
            setError(apiError.message || 'حدث خطأ أثناء الحفظ.');
        }
    };

    if (!isOpen) return null;

    const isOverallLoading = isLoading || isUploadingImage;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {isEditMode ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                    </h3>
                    <button 
                        onClick={onClose} 
                        disabled={isOverallLoading}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                    >
                        <X size={22} />
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Supplier Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">شعار المورد</label>
                        <div className="flex flex-col items-center">
                            {imagePreview ? (
                                <div className="w-full h-32 mb-3 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
                                    <img 
                                        src={imagePreview} 
                                        alt="معاينة الشعار" 
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-32 mb-3 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <ImageIcon size={32} className="mb-2 opacity-70" />
                                    <span className="text-xs">لم يتم اختيار شعار</span>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 w-full">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isOverallLoading}
                                    className="flex-grow bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <UploadCloud size={16} />
                                    {imageFile ? 'تغيير الشعار' : 'رفع شعار'}
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
                                        className="text-xs text-red-600 hover:text-red-800 px-3 py-2 border border-red-300 rounded-md hover:bg-red-50"
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
                                <p className="text-xs text-indigo-600 mt-2 animate-pulse text-center">
                                    جاري رفع الصورة...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Supplier Name */}
                    <div>
                        <label htmlFor="s_name" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <User className="h-4 w-4" />
                            اسم المورد
                        </label>
                        <input 
                            type="text" 
                            name="name" 
                            id="s_name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="أدخل اسم المورد"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="s_email" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <Mail className="h-4 w-4" />
                            البريد الإلكتروني
                        </label>
                        <input 
                            type="email" 
                            name="email" 
                            id="s_email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="supplier@example.com"
                        />
                    </div>

                    {/* Password (only for new suppliers) */}
                    {!isEditMode && (
                        <div>
                            <label htmlFor="s_password" className="block text-sm font-medium text-gray-700 mb-1">
                                كلمة المرور الأولية
                            </label>
                            <input 
                                type="password" 
                                name="password" 
                                id="s_password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required={!isEditMode} 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="كلمة مرور قوية"
                            />
                        </div>
                    )}

                    {/* Category and Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="s_category" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <Tag className="h-4 w-4" />
                                الفئة
                            </label>
                            <input 
                                type="text" 
                                name="category" 
                                id="s_category" 
                                value={formData.category} 
                                onChange={handleChange} 
                                required 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="مثل: أدوية، معدات طبية"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="s_location" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="h-4 w-4" />
                                الموقع (اختياري)
                            </label>
                            <input 
                                type="text" 
                                name="location" 
                                id="s_location" 
                                value={formData.location} 
                                onChange={handleChange} 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="المدينة أو المنطقة"
                            />
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label htmlFor="s_rating" className="block text-sm font-medium text-gray-700 mb-1">
                            التقييم (اختياري، 0-5)
                        </label>
                        <input 
                            type="number" 
                            name="rating" 
                            id="s_rating" 
                            value={formData.rating} 
                            onChange={handleChange} 
                            step="0.1" 
                            min="0" 
                            max="5" 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="4.5"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="s_description" className="block text-sm font-medium text-gray-700 mb-1">
                            الوصف (اختياري)
                        </label>
                        <textarea 
                            name="description" 
                            id="s_description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="3" 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            placeholder="وصف مختصر عن المورد وخدماته"
                        />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            name="is_active" 
                            id="s_is_active" 
                            checked={formData.is_active} 
                            onChange={handleChange} 
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="s_is_active" className="text-sm font-medium text-gray-700">
                            مورد نشط (يمكنه استقبال طلبات)
                        </label>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isOverallLoading}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isOverallLoading}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {isOverallLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {isUploadingImage ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}
                                </>
                            ) : (
                                isEditMode ? 'حفظ التعديلات' : 'إضافة المورد'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierFormModal;