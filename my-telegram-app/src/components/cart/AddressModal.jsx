import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, MapPin, Building, AlertCircle, Loader2 } from 'lucide-react';

const AddressModal = ({
    show,
    onClose,
    initialData = {},
    onSaveAndProceed,
    error,
    isSaving,
    availableCities = []
}) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        ...initialData
    });

    const [validationErrors, setValidationErrors] = useState({});

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
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
        
        if (!formData.fullName.trim()) {
            errors.fullName = 'الاسم الكامل مطلوب';
        }
        
        if (!formData.phoneNumber.trim()) {
            errors.phoneNumber = 'رقم الهاتف مطلوب';
        } else if (!/^[0-9+\-\s()]{10,}$/.test(formData.phoneNumber.trim())) {
            errors.phoneNumber = 'رقم الهاتف غير صحيح';
        }
        
        if (!formData.addressLine1.trim()) {
            errors.addressLine1 = 'العنوان مطلوب';
        }
        
        if (!formData.city.trim()) {
            errors.city = 'المدينة مطلوبة';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        try {
            await onSaveAndProceed(formData);
        } catch (err) {
            console.error('Address save error:', err);
        }
    };

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            dir="rtl"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">تفاصيل التوصيل</h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
                        disabled={isSaving}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3 border border-red-200">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <User className="h-4 w-4 ml-2 text-gray-400" />
                            الاسم الكامل
                        </label>
                        <input 
                            type="text" 
                            name="fullName" 
                            id="fullName" 
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                validationErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="أدخل اسمك الكامل"
                            disabled={isSaving}
                        />
                        {validationErrors.fullName && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.fullName}</p>
                        )}
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label htmlFor="phoneNumber" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Phone className="h-4 w-4 ml-2 text-gray-400" />
                            رقم الهاتف
                        </label>
                        <input 
                            type="tel" 
                            name="phoneNumber" 
                            id="phoneNumber" 
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                validationErrors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="05xxxxxxxx"
                            disabled={isSaving}
                        />
                        {validationErrors.phoneNumber && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.phoneNumber}</p>
                        )}
                    </div>

                    {/* City */}
                    <div>
                        <label htmlFor="city" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="h-4 w-4 ml-2 text-gray-400" />
                            المدينة
                        </label>
                        <select 
                            name="city" 
                            id="city" 
                            value={formData.city}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                                validationErrors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            disabled={isSaving}
                        >
                            <option value="">اختر المدينة...</option>
                            {availableCities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        {validationErrors.city && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.city}</p>
                        )}
                    </div>

                    {/* Address Line 1 */}
                    <div>
                        <label htmlFor="addressLine1" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Building className="h-4 w-4 ml-2 text-gray-400" />
                            العنوان الأساسي
                        </label>
                        <input 
                            type="text" 
                            name="addressLine1" 
                            id="addressLine1" 
                            value={formData.addressLine1}
                            onChange={handleInputChange}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                validationErrors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="الشارع، رقم المبنى، المنطقة"
                            disabled={isSaving}
                        />
                        {validationErrors.addressLine1 && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors.addressLine1}</p>
                        )}
                    </div>

                    {/* Address Line 2 (Optional) */}
                    <div>
                        <label htmlFor="addressLine2" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Building className="h-4 w-4 ml-2 text-gray-400" />
                            تفاصيل إضافية (اختياري)
                        </label>
                        <textarea 
                            name="addressLine2" 
                            id="addressLine2" 
                            value={formData.addressLine2}
                            onChange={handleInputChange}
                            placeholder="رقم الشقة، علامة مميزة، تعليمات التوصيل..."
                            rows="2" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                            disabled={isSaving}
                        />
                    </div>
                    
                    {/* Submit Button */}
                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    جاري الحفظ والمتابعة...
                                </>
                            ) : (
                                "حفظ ومتابعة الطلب"
                            )}
                        </button>
                    </div>
                </form>

                <div className="px-6 pb-6">
                    <p className="text-xs text-gray-500 text-center">
                        سيتم حفظ هذه المعلومات لتسهيل الطلبات المستقبلية
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AddressModal;