// src/components/cart/CartSidebar.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

const CartSidebar = ({ show, onClose, cartItems, isLoading, error, onIncrease, onDecrease, onRemove, onCheckout, isPlacingOrder, pendingUpdate }) => {
    const { formatPrice } = useCurrency();
    if (!show) return null;

    const total = cartItems.reduce((total, item) => {
        const price = item.effective_selling_price ?? 0;
        return total + (formatPrice(price) * item.quantity);
    }, 0);
  console.log('[DEBUG] Rendering CartSidebar with items:', cartItems);
    return (
        <motion.div
            key="cart-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
        >
            <div className="p-4 flex-shrink-0 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">سلة التسوق</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-full"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {isLoading && <p className="text-center text-gray-500">جار تحميل السلة...</p>}
                {error && <p className="text-center text-red-500">خطأ: {error}</p>}
                {!isLoading && !error && cartItems.length === 0 && <p className="text-center text-gray-500">سلة التسوق فارغة.</p>}
                {!isLoading && !error && cartItems.map(item => (
                    <div key={item.product_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="h-16 w-16 rounded-lg flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }}></div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{item.name}</h3>
                          <div className="text-blue-600">{item.effective_selling_price} </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => onDecrease(item.product_id)} disabled={pendingUpdate} className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"><Minus className="h-4 w-4" /></button>
                            <span className="w-6 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => onIncrease(item.product_id)} disabled={pendingUpdate} className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"><Plus className="h-4 w-4" /></button>
                            <button onClick={() => onRemove(item.product_id)} disabled={pendingUpdate} className="p-1.5 rounded text-red-500 hover:text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {!isLoading && cartItems.length > 0 && (
                <div className="p-4 mt-auto border-t flex-shrink-0">
                    <div className="flex justify-between items-center mb-4"><span className="font-bold">المجموع:</span><span className="font-bold">{total} </span></div>
                    <button onClick={onCheckout} disabled={isPlacingOrder || cartItems.length === 0} className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50">
                        {isPlacingOrder ? "جار إنشاء الطلب..." : "إتمام الشراء"}
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default CartSidebar;