// src/components/modals/ProfileModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, Home, Loader2 } from 'lucide-react';

const ProfileModal = ({ show, onClose, formData, onFormChange, onFormSubmit, error, isSaving }) => {
    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-bold text-gray-800">تعديل الملف الشخصي</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>

                <form onSubmit={onFormSubmit} className="p-6 space-y-5">
                    {/* Full Name */}
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text" name="fullName" placeholder="الاسم الكامل"
                            value={formData.fullName} onChange={onFormChange}
                            required
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    {/* Phone Number */}
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="tel" name="phoneNumber" placeholder="رقم الهاتف"
                            value={formData.phoneNumber} onChange={onFormChange}
                            required
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    {/* Address Line 1 */}
                    <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text" name="addressLine1" placeholder="العنوان (الشارع، المبنى)"
                            value={formData.addressLine1} onChange={onFormChange}
                            required
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                     {/* City */}
                    <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text" name="city" placeholder="المدينة"
                            value={formData.city} onChange={onFormChange}
                            required
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div className="pt-2">
                        <button
                            type="submit" disabled={isSaving}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : 'حفظ التغييرات'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default ProfileModal;