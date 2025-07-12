// src/components/ProductFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
// Make sure to import icons you want to use
import { X, UploadCloud, Image as ImageIcon, AlertTriangle } from 'lucide-react'; 

const ProductFormModal = ({ isOpen, onClose, onSave, productToEdit, isLoading: isSavingProduct }) => { // Renamed isLoading to isSavingProduct for clarity
    const initialFormState = {
        name: '',
        standardized_name_input: '',
        description: '',
        price: '',
        discount_price: '',
        category: '',
        image_url: '', // This will store the final URL (Cloudinary or existing)
        is_on_sale: false,
        stock_level: 0,
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState('');

    // --- NEW State for Image Handling ---
    const [imageFile, setImageFile] = useState(null); // Holds the File object if a new image is selected
    const [imagePreview, setImagePreview] = useState(''); // URL for preview (local blob or existing image_url)
    const [isUploadingImage, setIsUploadingImage] = useState(false); // Specific loading state for image upload
    const fileInputRef = useRef(null);

    // --- Cloudinary Configuration ---
    // IMPORTANT: Move these to your .env file for the supplier-admin-panel project
    // VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
    // VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
    const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    useEffect(() => {
        if (isOpen) { // Only update form when modal is opened or productToEdit changes
            if (productToEdit) {
                setFormData({
                    name: productToEdit.name || '',
                    standardized_name_input: productToEdit.standardized_name_input || '',
                    description: productToEdit.description || '',
                    price: productToEdit.price?.toString() || '',
                    discount_price: productToEdit.discount_price?.toString() || '',
                    category: productToEdit.category || '',
                    image_url: productToEdit.image_url || '', // Existing image URL
                    is_on_sale: productToEdit.is_on_sale || false,
                    stock_level: productToEdit.stock_level?.toString() || '0',
                });
                setImagePreview(productToEdit.image_url || ''); // Set preview to existing image
            } else {
                setFormData(initialFormState);
                setImagePreview(''); // No preview for new product initially
            }
            setImageFile(null); // Always reset staged file when modal opens/product changes
            setError(''); // Clear previous errors
            if(fileInputRef.current) fileInputRef.current.value = null; // Reset file input
        }
    }, [isOpen, productToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleImageFileChange = (e) => {
        const file = e.target.files[0];
        setError(''); // Clear previous errors

        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit example
                setError('ملف الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');
                setImageFile(null);
                setImagePreview(formData.image_url || ''); // Revert preview to old or empty
                e.target.value = null; // Clear the file input
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
                setError('نوع ملف الصورة غير صالح (المسموح به: JPG, PNG, WEBP, GIF).');
                setImageFile(null);
                setImagePreview(formData.image_url || '');
                e.target.value = null; // Clear the file input
                return;
            }
            
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file)); // Show local preview
        }
    };

    const uploadImageToCloudinary = async () => {
        if (!imageFile) return formData.image_url || null; // No new file, return existing URL or null

        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
            console.error("Cloudinary credentials not configured in .env. Ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set.");
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
                console.log('Image uploaded to Cloudinary:', data.secure_url);
                return data.secure_url;
            } else {
                console.error('Cloudinary upload failed:', data.error?.message || data);
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
        // ... (your existing form validation for name, price, category, etc.) ...
        if (!formData.name.trim() || !formData.price.toString().trim() || !formData.category.trim() || !formData.standardized_name_input.trim()) {
            setError('اسم العرض، الاسم القياسي، السعر، والفئة حقول مطلوبة.');
            return;
        }
        // Add other specific validations as needed

        try {
            let finalImageUrl = formData.image_url; // Start with existing or initially empty URL
            if (imageFile) { // If a new file was selected by the user
                finalImageUrl = await uploadImageToCloudinary(); // Upload it and get the new URL
            }

            const payload = {
                ...formData,
                image_url: finalImageUrl, // Use the new Cloudinary URL or the existing one
                price: parseFloat(formData.price),
                discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
                stock_level: formData.stock_level ? parseInt(formData.stock_level) : 0,
                is_on_sale: Boolean(formData.is_on_sale), // Ensure boolean
            };

            await onSave(payload, productToEdit?.id); // onSave is handleSaveProduct from ProductsPage
            // Success is handled by ProductsPage (closing modal, refreshing list)
        } catch (apiError) {
            // This error comes from onSave (handleSaveProduct) or uploadImageToCloudinary
            setError(apiError.message || 'حدث خطأ أثناء حفظ المنتج.');
        }
    };

    if (!isOpen) return null;

    const isOverallLoading = isSavingProduct || isUploadingImage; // Combined loading state for buttons

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-xl font-semibold text-gray-700">
                        {productToEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                    </h3>
                    <button onClick={onClose} disabled={isOverallLoading} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded" role="alert">
                        <div className="flex">
                            <div className="py-1"><AlertTriangle className="h-5 w-5 text-red-500 mr-2"/></div>
                            <div>
                                <p className="font-bold">خطأ</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}


                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">اسم المنتج (للعرض)</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                    {/* Standardized Name */}
                    <div>
                        <label htmlFor="standardized_name_input" className="block text-sm font-medium text-gray-700">
                            الاسم القياسي للمنتج <span className="text-xs text-gray-500">(كما هو على العبوة، للربط الآلي)</span>
                        </label>
                        <input 
                            type="text" name="standardized_name_input" id="standardized_name_input" 
                            value={formData.standardized_name_input} onChange={handleChange} required 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="الاسم الرسمي للمنتج من المصنع/العبوة"
                        />
                    </div>
                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">الوصف</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    </div>

                    {/* Price & Discount Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">السعر (د.إ)</label>
                            <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                        <div>
                            <label htmlFor="discount_price" className="block text-sm font-medium text-gray-700">سعر الخصم (د.إ) <span className="text-xs text-gray-500">(اختياري)</span></label>
                            <input type="number" name="discount_price" id="discount_price" value={formData.discount_price} onChange={handleChange} step="0.01" min="0" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                    </div>

                    {/* Category & Stock Level */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">الفئة</label>
                            <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                        <div>
                            <label htmlFor="stock_level" className="block text-sm font-medium text-gray-700">كمية المخزون</label>
                            <input type="number" name="stock_level" id="stock_level" value={formData.stock_level} onChange={handleChange} min="0" step="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                        </div>
                    </div>

                    {/* --- Image Upload Field --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">صورة المنتج</label>
                        <div className="mt-1 flex flex-col items-center">
                            {imagePreview ? (
                                <div className="w-full h-40 sm:h-48 mb-2 rounded-md overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
                                    <img src={imagePreview} alt="معاينة المنتج" className="max-w-full max-h-full object-contain"/>
                                </div>
                            ) : (
                                <div className="w-full h-40 sm:h-48 mb-2 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <ImageIcon size={40} className="mb-2 opacity-70" />
                                    <span className="text-xs">لم يتم اختيار صورة</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 w-full">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    disabled={isUploadingImage || isSavingProduct}
                                    className="flex-grow relative cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    <UploadCloud size={16} className="inline ml-2 align-middle" /> {/* mr-2 for RTL */}
                                    <span>{imageFile ? 'تغيير الصورة' : 'رفع صورة'}</span>
                                    <input 
                                        ref={fileInputRef}
                                        id="file-upload" 
                                        name="file-upload" 
                                        type="file" 
                                        className="sr-only" // Hidden, triggered by button
                                        accept="image/png, image/jpeg, image/webp, image/gif" // Specify accepted types
                                        capture // This attribute might prompt camera option more directly on mobile
                                        onChange={handleImageFileChange}
                                    />
                                </button>
                                {(imagePreview && (imageFile || (productToEdit && productToEdit.image_url))) && ( // Show "Clear" if there's a preview from a new file or an existing URL
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setImageFile(null); 
                                            setImagePreview(''); 
                                            setFormData(prev => ({...prev, image_url: ''})); // Also clear from formData
                                            if(fileInputRef.current) fileInputRef.current.value = null;
                                        }} 
                                        className="text-xs text-red-600 hover:text-red-800 px-2 py-1" 
                                        disabled={isUploadingImage || isSavingProduct}
                                        title="Clear image selection"
                                    >
                                        مسح الصورة
                                    </button>
                                )}
                            </div>
                            {isUploadingImage && <p className="text-xs text-indigo-600 mt-1 animate-pulse text-center">جاري رفع الصورة...</p>}
                            {/* Remove the old image_url text input */}
                        </div>
                    </div>
                    {/* --- End Image Upload Field --- */}
                    
                    {/* Is on Sale Checkbox */}
                    <div className="flex items-center pt-2">
                        <input type="checkbox" name="is_on_sale" id="is_on_sale" checked={formData.is_on_sale} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                        <label htmlFor="is_on_sale" className="mr-2 block text-sm text-gray-900">هل هذا المنتج عليه تخفيض حالياً؟</label>
                    </div>

                    {/* Submit/Cancel Buttons */}
                    <div className="pt-5 flex justify-end space-x-3 space-x-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isOverallLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isOverallLoading}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 disabled:opacity-50"
                        >
                            {isOverallLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (productToEdit ? 'حفظ التعديلات' : 'إضافة المنتج')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormModal;