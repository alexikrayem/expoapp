// src/components/cart/CartSidebar.jsx (DEFINITIVE FINAL VERSION)
import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';

// FIX: The component no longer needs to accept userProfile, telegramUser, or onProfileUpdate as props.
const CartSidebar = ({ show, onClose }) => {
    const { formatPrice } = useCurrency();
    const { cartItems, isLoadingCart, isCartUpdating, cartError, actions } = useCart();
    // FIX: The startCheckout function no longer takes arguments.
    const { startCheckout, isPlacingOrder } = useCheckout();

    if (!show) return null;

    const total = (cartItems || []).reduce((total, item) => {
        const price = parseFloat(item.effective_selling_price || item.price || 0);
        return total + (price * item.quantity);
    }, 0);

    // The handleCheckout function is now just a simple, direct call.
    const handleCheckout = () => {
        startCheckout();
    };

    return (
        <motion.div
            key="cart-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
            dir="rtl"
        >
            <div className="p-4 flex-shrink-0 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">سلة التسوق</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-full"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {isLoadingCart && <div className="flex justify-center pt-10"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}
                {cartError && <p className="text-center text-red-500">خطأ: {cartError}</p>}
                {!isLoadingCart && !cartError && cartItems.length === 0 && <p className="text-center text-gray-500 pt-10">سلة التسوق فارغة.</p>}
                
                {!isLoadingCart && !cartError && cartItems.map(item => (
                    <div key={item.product_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="h-16 w-16 rounded-lg flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }}></div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{item.name}</h3>
                            <div className="text-blue-600 font-semibold">{formatPrice(item.effective_selling_price)}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => actions.decreaseQuantity(item.product_id)} disabled={isCartUpdating} className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"><Minus className="h-4 w-4" /></button>
                            <span className="w-6 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => actions.increaseQuantity(item.product_id)} disabled={isCartUpdating} className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"><Plus className="h-4 w-4" /></button>
                            <button onClick={() => actions.removeItem(item.product_id)} disabled={isCartUpdating} className="p-1.5 rounded text-red-500 hover:text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {!isLoadingCart && cartItems.length > 0 && (
                <div className="p-4 mt-auto border-t flex-shrink-0">
                    <div className="flex justify-between items-center mb-4 text-lg">
                        <span className="font-semibold">المجموع:</span>
                        <span className="font-bold text-blue-600">{formatPrice(total)}</span>
                    </div>
                    <button 
                        onClick={handleCheckout} 
                        disabled={isPlacingOrder} 
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {isPlacingOrder ? <Loader2 className="h-5 w-5 animate-spin"/> : "إتمام الشراء"}
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default CartSidebar;