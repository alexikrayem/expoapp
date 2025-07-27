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


    
    return (
        <motion.div
            className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer flex flex-col z-0"
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' }}
            onClick={() => onShowDetails(product)}
            layout
        >
            <div className="h-32 w-full flex items-center justify-center text-white relative bg-gray-100 rounded-t-xl overflow-hidden">
                {product.image_url && !product.image_url.startsWith('linear-gradient') ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" onError={handleImageError} />
                ) : (
                    <div className="w-full h-full" style={product.image_url ? { background: product.image_url } : {}}>
                        {!product.image_url && <span className="text-xs text-gray-500 p-2 text-center flex items-center justify-center h-full">لا توجد صورة</span>}
                    </div>
                )}
                <span className="text-xs text-gray-500 p-2 text-center image-placeholder-text" style={{display: 'none', alignItems: 'center', justifyContent: 'center', height: '100%'}}>لا يمكن تحميل الصورة</span>
                {product.is_on_sale && (<div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">تخفيض</div>)}
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id);}} className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm z-10">
                    <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-gray-600'}`}/>
                </button>
            </div>
            <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-semibold text-sm mb-1 text-gray-800 flex-grow min-h-[2.5em] line-clamp-2">{product.name}</h3>
                <div className="flex items-end justify-between mt-auto">
                    <div>
                        {product.is_on_sale && product.discount_price && (<span className="text-xs line-through text-gray-400 mr-1">{parseFloat(product.effective_selling_price)} </span>)}
                        <div className="text-blue-600 font-bold text-base">{formatPrice(product.is_on_sale && product.discount_price ? product.discount_price : product.effective_selling_price)} </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onAddToCart(product);}} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-500 hover:text-white">
                        <ShoppingCart className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;