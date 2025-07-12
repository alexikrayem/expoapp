// src/components/modals/ProductDetailModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, Heart, AlertTriangle, ChevronsRight } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

// A new sub-component for cleanly displaying an alternative product suggestion
const AlternativeProductCard = ({ product, onSelect }) => (

    <div 
        onClick={() => onSelect(product.id)}
        className="flex items-center gap-4 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
    >
        <div className="flex-grow">
            <p className="font-semibold text-blue-800">{product.name}</p>
            <p className="text-sm text-gray-600">
                متوفر لدى: <span className="font-medium">{product.supplier_name}</span>
            </p>
        </div>
        <div className="text-right">
            <p className="font-bold text-lg text-blue-700">
                {parseFloat(product.effective_selling_price)}             </p>
        </div>
        <ChevronsRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
    </div>
);

const ProductDetailModal = ({ show, onClose, productData, isLoading, error, onAddToCart, onToggleFavorite, onSelectAlternative }) => {
    // The main prop is now `productData` which holds our { originalProduct, ... } object
    const { formatPrice } = useCurrency();
    if (!show) return null;

    // Destructure the data for easier access inside the component
    const { originalProduct, isAvailable, alternatives } = productData || {};

    // Determine if the product is a favorite. The onToggleFavorite prop now needs to be an object.
    const isFavorite = originalProduct ? onToggleFavorite.isFavorite(originalProduct.id) : false;

    const handleAddToCart = () => {
        if (isAvailable && originalProduct) {
            onAddToCart(originalProduct);
        }
    };

    return (
        <motion.div
            key="productDetailModal"
            initial={{ y: "100vh" }}
            animate={{ y: 0 }}
            exit={{ y: "100vh" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="fixed inset-0 bg-gray-50 z-50 flex flex-col overflow-y-auto"
            dir="rtl"
        >
            <div className="sticky top-0 bg-white p-4 shadow-md z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 truncate">
                    {isLoading ? "جاري التحميل..." : (originalProduct ? originalProduct.name : "تفاصيل المنتج")}
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-full"><X className="h-6 w-6" /></button>
            </div>

            <div className="flex-grow p-4 md:p-6">
                {isLoading && <div className="flex justify-center items-center h-full"><p>جاري تحميل التفاصيل...</p></div>}
                {error && <div className="text-center py-10"><p className="text-red-500 font-semibold text-lg">خطأ!</p><p className="text-gray-600 mt-2">{error}</p></div>}
                
                {!isLoading && !error && originalProduct && (
                    <div className="space-y-6">
                        
                        {/* === UNAVAILABLE WARNING - THIS IS NEW === */}
                        {!isAvailable && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg" role="alert">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-6 w-6 ml-3 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">هذا المنتج غير متوفر حالياً من المورد الأصلي.</p>
                                        <p className="text-sm">لكن قد يكون متوفراً لدى موردين آخرين أدناه.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Image Section - now has grayscale effect if unavailable */}
                        <div className={`w-full h-64 sm:h-80 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow bg-cover bg-center ${!isAvailable ? 'grayscale' : ''}`} style={{ backgroundImage: `url(${originalProduct.image_url})` }}></div>
                        
                        {/* Details Section */}
                        <div className="space-y-3">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{originalProduct.name}</h1>
                            {originalProduct.supplier_name && (
                                <p className="text-md text-gray-500">
                                    المورد الأصلي: <span className="font-semibold text-gray-700">{originalProduct.supplier_name}</span>
                                </p>
                            )}
                            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                <p className={`text-4xl font-extrabold ${isAvailable ? 'text-blue-600' : 'text-gray-400 line-through'}`}>
                                    {formatPrice(originalProduct.effective_selling_price)}                                </p>
                            </div>
                        </div>
                        
                        {originalProduct.description && (
                            <div className="border-t pt-4">
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">الوصف:</h4>
                                <p className="text-gray-700 leading-relaxed">{originalProduct.description}</p>
                            </div>
                        )}

                        {/* ACTION BUTTONS (conditionally disabled) */}
                        <div className="pt-6 border-t flex items-center gap-3">
                            <button onClick={handleAddToCart} disabled={!isAvailable} className="flex-grow bg-blue-500 text-white py-3.5 px-6 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                                <ShoppingCart className="h-5 w-5" /> {isAvailable ? 'إضافة للسلة' : 'غير متوفر'}
                            </button>
                            <button onClick={() => onToggleFavorite.toggle(originalProduct.id)} className="p-3.5 border border-gray-300 rounded-lg text-gray-600 hover:border-red-500 hover:text-red-500">
                                <Heart className={`h-6 w-6 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
                            </button>
                        </div>

                        {/* === ALTERNATIVES SECTION - THIS IS NEW === */}
                        {alternatives && alternatives.length > 0 && (
                            <div className="border-t pt-6">
                                <h4 className="text-lg font-bold text-green-700 mb-3">
                                    متوفر لدى موردين آخرين:
                                </h4>
                                <div className="space-y-3">
                                    {alternatives.map(alt => (
                                        <AlternativeProductCard 
                                            key={alt.id} 
                                            product={alt} 
                                            onSelect={onSelectAlternative}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ProductDetailModal;