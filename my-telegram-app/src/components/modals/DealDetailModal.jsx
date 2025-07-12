// src/components/modals/DealDetailModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeftIcon } from 'lucide-react';

const DealDetailModal = ({ show, onClose, deal, isLoading, error, onProductClick, onSupplierClick }) => {
    if (!show) return null;

    return (
        <motion.div
            key="dealDetailModal"
            initial={{ y: "100vh" }}
            animate={{ y: 0 }}
            exit={{ y: "100vh" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto"
            dir="rtl"
        >
            <div className="sticky top-0 bg-white p-4 shadow-md z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 truncate">{isLoading ? "جاري التحميل..." : (deal ? deal.title : "تفاصيل العرض")}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2"><X className="h-6 w-6" /></button>
            </div>
            <div className="flex-grow p-4 md:p-6">
                {isLoading && <div className="flex justify-center items-center h-full"><p>جاري تحميل التفاصيل...</p></div>}
                {error && <div className="text-center py-10"><p className="text-red-500 font-semibold text-lg">خطأ!</p><p className="text-gray-600 mt-2">{error}</p></div>}
                {!isLoading && !error && deal && (
                    <div className="space-y-6">
                        <div className="w-full h-48 md:h-64 bg-gray-200 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${deal.image_url})` }}></div>
                        <div>
                            {deal.discount_percentage && <p className="text-3xl font-extrabold text-red-600 mb-2">خصم {deal.discount_percentage}%</p>}
                            <p className="text-gray-700 leading-relaxed mb-4">{deal.description || "لا توجد تفاصيل إضافية لهذا العرض."}</p>
                        </div>
                        {deal.product_id && deal.product_name && (
                            <div className="border-t pt-4">
                                <h4 className="text-md font-semibold text-gray-700 mb-2">المنتج المرتبط:</h4>
                                <div onClick={() => onProductClick(deal.product_id)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                    <p className="flex-grow font-semibold text-blue-700">{deal.product_name}</p>
                                    <ChevronLeftIcon className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default DealDetailModal;