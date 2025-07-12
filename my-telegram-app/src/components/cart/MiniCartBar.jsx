// src/components/cart/MiniCartBar.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

const MiniCartBar = ({ cartItems, showActiveItemControls, activeMiniCartItem, onIncrease, onDecrease, onRemove, onHideActiveItem, onViewCart }) => {
    const totalCartPrice = cartItems.reduce((total, item) => {
        const price = item.effective_selling_price ?? 0;
        return total + (formatPrice(price) * item.quantity);
    }, 0);
    const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const renderActiveItemControls = () => {
        const currentItemInCart = cartItems.find(item => item.product_id === activeMiniCartItem?.product_id);
        const displayItem = currentItemInCart || activeMiniCartItem;
console.log("MiniCartBar: displayItem =", displayItem); // 👈 Paste this here

        if (!showActiveItemControls || !displayItem || displayItem.quantity === 0) {
            return null;
        }

        return (
            <motion.div
                key={`active-item-${displayItem.product_id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                className="relative bg-white p-3.5 shadow-lg rounded-t-xl border-b border-gray-200 w-full"
            >
                <button onClick={onHideActiveItem} className="absolute top-2.5 left-2.5 p-1 text-gray-400 hover:text-gray-700 rounded-full" aria-label="Close active item controls">
                    <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-between gap-3 pl-8">
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                        {displayItem.image_url && <div className="w-12 h-12 rounded-md bg-gray-200 flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${displayItem.image_url})` }}></div>}
                        <span className="text-sm font-medium text-gray-800 truncate">{displayItem.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => onDecrease(displayItem.product_id)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><Minus className="h-4 w-4 text-gray-700"/></button>
                        <span className="text-md font-semibold w-7 text-center">{displayItem.quantity}</span>
                        <button onClick={() => onIncrease(displayItem.product_id)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><Plus className="h-4 w-4 text-gray-700"/></button>
                        <button onClick={() => onRemove(displayItem.product_id)} className="p-2 text-red-500 hover:text-red-700 rounded-lg"><Trash2 className="h-4 w-4"/></button>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (cartItems.length === 0 && !showActiveItemControls) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center" dir="rtl">
            <div className="w-full max-w-4xl px-3 sm:px-4 pb-2 sm:pb-3">
                <AnimatePresence>
                    {renderActiveItemControls()}
                </AnimatePresence>
                {cartItems.length > 0 && (
                    <motion.div
                        initial={showActiveItemControls ? { y:0, opacity: 1 } : { y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                        className={`bg-blue-600 text-white shadow-xl p-3.5 w-full ${showActiveItemControls ? 'rounded-b-xl' : 'rounded-t-xl'}`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <ShoppingCart className="h-6 w-6" />
                                    <span className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">{totalCartItems}</span>
                                </div>
                                <div className="font-bold text-lg">{totalCartPrice} </div>
                            </div>
                            <button onClick={onViewCart} className="bg-white hover:bg-gray-200 text-blue-600 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-colors">
                                عرض السلة
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default MiniCartBar;