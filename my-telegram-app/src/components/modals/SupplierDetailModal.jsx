// src/components/modals/SupplierDetailModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Star } from 'lucide-react';
import ProductCard from '../common/ProductCard'; // Reuse the product card

const SupplierDetailModal = ({ show, onClose, supplier, isLoading, error, onProductClick, onViewAllProducts, onAddToCart, onToggleFavorite, userFavoriteProductIds }) => {
    if (!show) return null;

    return (
        <motion.div
            key="supplierDetailModal"
            initial={{ x: "100vw" }}
            animate={{ x: 0 }}
            exit={{ x: "100vw" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="fixed inset-0 bg-gray-100 z-50 flex flex-col overflow-y-auto"
            dir="rtl"
        >
            <div className="sticky top-0 bg-white p-4 shadow-md z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 truncate">{isLoading ? "جاري التحميل..." : (supplier ? supplier.name : "تفاصيل المورد")}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2"><X className="h-6 w-6" /></button>
            </div>
            <div className="flex-grow">
                {isLoading && <div className="flex justify-center items-center h-full"><p>جاري تحميل التفاصيل...</p></div>}
                {error && <div className="text-center py-10"><p className="text-red-500 font-semibold text-lg">خطأ!</p><p className="text-gray-600 mt-2">{error}</p></div>}
                {!isLoading && !error && supplier && (
                    <>
                        <div className="w-full h-40 md:h-56 bg-gray-300 bg-cover bg-center" style={{ backgroundImage: `url(${supplier.image_url})` }}></div>
                        <div className="p-4 md:p-6 space-y-5">
                            <div className="pb-4 border-b">
                                <h3 className="text-2xl font-bold text-gray-900">{supplier.name}</h3>
                                {supplier.location && <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600"><MapPin className="h-4 w-4"/> {supplier.location}</div>}
                            </div>
                            {supplier.products?.length > 0 && (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-700 mb-3">منتجات من هذا المورد:</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {supplier.products.map(prod => (
                                            <ProductCard key={prod.id} product={prod} onShowDetails={onProductClick} onAddToCart={onAddToCart} onToggleFavorite={onToggleFavorite} isFavorite={userFavoriteProductIds.has(prod.id)} />
                                        ))}
                                    </div>
                                    {supplier.hasMoreProducts && (
                                        <div className="text-center mt-4"><button onClick={() => onViewAllProducts(supplier.name)} className="text-blue-600 font-medium text-sm">عرض كل المنتجات</button></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default SupplierDetailModal;