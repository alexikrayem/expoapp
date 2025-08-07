// src/components/cart/CartSidebar.jsx - Enhanced cart sidebar with checkout flow
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useOutletContext } from 'react-router-dom';

const CartSidebar = ({ show, onClose }) => {
    const { cartItems, actions, getCartTotal, getCartItemCount } = useCart();
    const { startCheckout, isPlacingOrder } = useCheckout();
    const { formatPrice } = useCurrency();
    const { telegramUser, userProfile, onProfileUpdate } = useOutletContext();
    
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const handleClose = () => {
        setIsAnimatingOut(true);
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        setTimeout(() => {
            onClose();
            setIsAnimatingOut(false);
        }, 200);
    };

    const handleCheckout = async () => {
        try {
            window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
            await startCheckout(userProfile, telegramUser, onProfileUpdate);
            // Success haptic feedback will be handled in checkout context
        } catch (error) {
            console.error('Checkout error:', error);
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        }
    };

    const handleQuantityChange = (productId, action) => {
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light');
        if (action === 'increase') {
            actions.increaseQuantity(productId);
        } else if (action === 'decrease') {
            actions.decreaseQuantity(productId);
        } else if (action === 'remove') {
            actions.removeItem(productId);
        }
    };

    if (!show) return null;

    const total = getCartTotal();
    const itemCount = getCartItemCount();

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={handleClose}
                    />
                    
                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: isAnimatingOut ? '100%' : 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">سلة التسوق</h2>
                                    <p className="text-sm text-gray-600">{itemCount} منتج</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Cart items */}
                        <div className="flex-1 overflow-y-auto">
                            {cartItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="p-6 bg-gray-100 rounded-full mb-4"
                                    >
                                        <ShoppingCart className="h-16 w-16 text-gray-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-semibold mb-2">سلة التسوق فارغة</h3>
                                    <p className="text-sm text-center text-gray-400">أضف منتجات لتبدأ التسوق</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    <AnimatePresence>
                                        {cartItems.map((item, index) => (
                                            <motion.div
                                                key={item.product_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Product image */}
                                                    <motion.div 
                                                        whileHover={{ scale: 1.05 }}
                                                        className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 bg-cover bg-center overflow-hidden shadow-sm"
                                                        style={{ 
                                                            backgroundImage: item.image_url ? `url(${item.image_url})` : 'none'
                                                        }}
                                                    >
                                                        {!item.image_url && (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ShoppingCart className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </motion.div>

                                                    {/* Product details */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">
                                                            {item.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mb-2">
                                                            {item.supplier_name}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-blue-600 font-bold text-sm">
                                                                {formatPrice(item.effective_selling_price)}
                                                            </div>
                                                            
                                                            {/* Quantity controls */}
                                                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                                                <motion.button
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => handleQuantityChange(item.product_id, 'decrease')}
                                                                    className="p-1.5 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm"
                                                                >
                                                                    {item.quantity > 1 ? (
                                                                        <Minus className="h-3 w-3 text-gray-600" />
                                                                    ) : (
                                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                                    )}
                                                                </motion.button>
                                                                
                                                                <span className="w-8 text-center font-semibold text-sm bg-white rounded px-2 py-1">
                                                                    {item.quantity}
                                                                </span>
                                                                
                                                                <motion.button
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => handleQuantityChange(item.product_id, 'increase')}
                                                                    className="p-1.5 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm"
                                                                >
                                                                    <Plus className="h-3 w-3 text-gray-600" />
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Footer with total and checkout */}
                        {cartItems.length > 0 && (
                            <motion.div 
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 space-y-4"
                            >
                                {/* Order summary */}
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600">المجموع الفرعي:</span>
                                        <span className="font-semibold text-gray-800">{formatPrice(total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600">رسوم التوصيل:</span>
                                        <span className="font-semibold text-green-600">مجاني</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-gray-800">المجموع:</span>
                                            <span className="text-xl font-bold text-blue-600">{formatPrice(total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Checkout button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCheckout}
                                    disabled={isPlacingOrder}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-200"
                                >
                                    {isPlacingOrder ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            جاري إنشاء الطلب...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-5 w-5" />
                                            إتمام الطلب
                                            <ArrowRight className="h-5 w-5" />
                                        </>
                                    )}
                                </motion.button>

                                {/* Additional info */}
                                <p className="text-xs text-gray-500 text-center">
                                    سيتم التواصل معك لتأكيد تفاصيل التوصيل
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;