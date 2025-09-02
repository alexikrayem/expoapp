import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Edit3, MapPin, User, Phone, Building } from 'lucide-react';

const AddressConfirmationModal = ({ 
    show, 
    onClose, 
    profileData, 
    onConfirmAndProceed, 
    onEditAddress,
    onCancel 
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            >
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">تأكيد عنوان التوصيل</h2>
                        <p className="text-gray-600 text-sm">
                            هل تريد استخدام العنوان المحفوظ أم تعديله؟
                        </p>
                    </div>

                    {/* Address Display */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-800 font-medium">{profileData.fullName}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-800">{profileData.phoneNumber}</span>
                        </div>
                        
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div className="text-gray-800">
                                <p>{profileData.addressLine1}</p>
                                {profileData.addressLine2 && (
                                    <p className="text-sm text-gray-600">{profileData.addressLine2}</p>
                                )}
                                <p className="text-sm font-medium">{profileData.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={onConfirmAndProceed}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-200"
                        >
                            تأكيد وإتمام الطلب
                        </button>
                        
                        <button
                            onClick={onEditAddress}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Edit3 className="h-4 w-4" />
                            تعديل العنوان
                        </button>
                        
                        <button
                            onClick={onCancel}
                            className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AddressConfirmationModal;