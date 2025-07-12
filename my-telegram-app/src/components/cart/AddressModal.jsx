// src/components/cart/AddressModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, MapPin, Building, AlertCircle } from 'lucide-react';

// A simple spinner component for the button
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AddressModal = ({
    show,
    onClose,
    formData,
    onFormChange,
    onFormSubmit,
    error,
    isSaving,
    availableCities = [] // Expects an array of city names, e.g., ['Dubai', 'Abu Dhabi']
}) => {
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
                className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg"
            >
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">تفاصيل التوصيل</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={onFormSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="fullName" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <User className="h-4 w-4 ml-2 text-gray-400" />
                            الاسم الكامل
                        </label>
                        <input type="text" name="fullName" id="fullName" required value={formData.fullName} onChange={onFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-transparent transition" />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label htmlFor="phoneNumber" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <Phone className="h-4 w-4 ml-2 text-gray-400" />
                            رقم الهاتف
                        </label>
                        <input type="tel" name="phoneNumber" id="phoneNumber" required value={formData.phoneNumber} onChange={onFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-transparent transition" />
                    </div>

                    {/* City Dropdown */}
                    <div>
                        <label htmlFor="city" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <MapPin className="h-4 w-4 ml-2 text-gray-400" />
                            المدينة
                        </label>
                        <select name="city" id="city" required value={formData.city} onChange={onFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-transparent transition bg-white">
                            <option value="" disabled>اختر المدينة...</option>
                            {availableCities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Address Line 1 */}
                    <div>
                        <label htmlFor="addressLine1" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <Building className="h-4 w-4 ml-2 text-gray-400" />
                            المنطقة / الشارع / رقم المبنى
                        </label>
                        <input type="text" name="addressLine1" id="addressLine1" required value={formData.addressLine1} onChange={onFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-transparent transition" />
                    </div>

                    {/* Address Line 2 (Optional) */}
                    <div>
                        <label htmlFor="addressLine2" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            تفاصيل إضافية للعنوان (اختياري)
                        </label>
                        <textarea name="addressLine2" id="addressLine2" value={formData.addressLine2} onChange={onFormChange} placeholder="مثال: رقم الشقة، علامة مميزة، إلخ." rows="2" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-transparent transition" />
                    </div>
                    
                    {/* Submit Button */}
                    <button type="submit" disabled={isSaving} className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-base">
                        {isSaving ? <Spinner /> : null}
                        {isSaving ? "جار الحفظ..." : "حفظ ومتابعة"}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AddressModal;