// src/components/common/ProductCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

const ProductCard = ({ product, onAddToCart, onToggleFavorite, onShowDetails, isFavorite }) => {
    const { formatPrice } = useCurrency();
    
    const handleImageError = (e) => {
        e.currentTarget.style.display = 'none';
        const placeholder = e.currentTarget.parentElement.querySelector('.image-placeholder-text');
        if (placeholder) placeholder.style.display = 'flex';
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        onAddToCart(product);
        // Telegram haptic feedback
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
    };

    const handleToggleFavorite = (e) => {
        e.stopPropagation();
        onToggleFavorite(product.id);
        // Telegram haptic feedback
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    const handleShowDetails = () => {
        onShowDetails(product);
        // Telegram haptic feedback
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
    };

    
    return (
        <motion.div
            className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer flex flex-col z-0 border border-gray-100"
            whileHover={{ 
                y: -8, 
                scale: 1.02,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' 
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShowDetails}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="h-36 w-full flex items-center justify-center text-white relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-xl overflow-hidden">
                {product.image_url && !product.image_url.startsWith('linear-gradient') ? (
                    <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" 
                        onError={handleImageError} 
                    />
                ) : (
                    <div className="w-full h-full" style={product.image_url ? { background: product.image_url } : {}}>
                        {!product.image_url && <span className="text-xs text-gray-500 p-2 text-center flex items-center justify-center h-full">لا توجد صورة</span>}
                    </div>
                )}
                <span className="text-xs text-gray-500 p-2 text-center image-placeholder-text" style={{display: 'none', alignItems: 'center', justifyContent: 'center', height: '100%'}}>لا يمكن تحميل الصورة</span>
                
                {/* Sale badge with animation */}
                {product.is_on_sale && (
                    <motion.div 
                        initial={{ scale: 0, rotate: -12 }}
                        animate={{ scale: 1, rotate: -12 }}
                        className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg"
                    >
                        تخفيض
                    </motion.div>
                )}
                
                {/* Enhanced favorite button */}
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleFavorite}
                    className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg z-10 backdrop-blur-sm"
                >
                    <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-400'}`}/>
                </motion.button>
            </div>
            
            <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold text-sm mb-2 text-gray-800 flex-grow min-h-[2.5em] line-clamp-2 leading-tight">
                    {product.name}
                </h3>
                
                {/* Supplier name */}
                <p className="text-xs text-gray-500 mb-2 truncate">{product.supplier_name}</p>
                
                <div className="flex items-end justify-between mt-auto">
                    <div>
                        {product.is_on_sale && product.discount_price && (
                            <span className="text-xs line-through text-gray-400 mr-1">
                                {formatPrice(product.price)}
                            </span>
                        )}
                        <div className="text-blue-600 font-bold text-base">
                            {formatPrice(product.effective_selling_price)}
                        </div>
                    </div>
                    
                    <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddToCart}
                        className="p-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 rounded-full hover:from-blue-500 hover:to-indigo-500 hover:text-white transition-all duration-200 shadow-sm"
                    >
                        <ShoppingCart className="h-4 w-4" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;