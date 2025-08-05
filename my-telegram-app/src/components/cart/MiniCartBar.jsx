// src/components/cart/MiniCartBar.jsx (DEFINITIVE CORRECTED VERSION)
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useMiniCart } from '../../context/MiniCartContext'; // Import the correct context

const MiniCartBar = () => {
    const navigate = useNavigate();
    
    // Data and actions for the cart's content come from CartContext
    const { cartItems, getCartTotal, getCartItemCount, actions } = useCart();
    
    // State and actions for the bar's visibility come from MiniCartContext
    const { activeMiniCartItem, showActiveItemControls, hideMiniCartBar } = useMiniCart();

    if (!cartItems || cartItems.length === 0) {
        return null;
    }

    const totalCartPrice = getCartTotal();
    const totalCartItems = getCartItemCount();

    // Derive the item to display in the top "active item" panel
    let displayItem = null;
    if (showActiveItemControls && activeMiniCartItem) {
        const activeItemId = activeMiniCartItem.id || activeMiniCartItem.product_id;
        displayItem = cartItems.find(item => item.product_id === activeItemId);
    }
    
    const handleViewCart = () => {
        // When viewing the cart, first hide the temporary active item panel
        hideMiniCartBar();
        // Then navigate to the orders page
        navigate('/orders');
    };

   // src/components/cart/MiniCartBar.jsx

// ... (imports and the top part of the component are the same) ...

return (
    <div className="fixed bottom-16 left-0 right-0 z-40 flex flex-col items-center pointer-events-none" dir="rtl">
        <div className="w-full max-w-4xl px-3 sm:px-4 pointer-events-auto">
            <AnimatePresence>
                {displayItem && (
                    <motion.div
                        key={`active-item-${displayItem.product_id}`}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="bg-white p-3.5 shadow-lg rounded-t-xl border-b w-full"
                    >
                        <button onClick={hideMiniCartBar} className="absolute top-2 left-2 p-1 text-gray-400">
                            <X size={16}/>
                        </button>
                        <div className="flex items-center justify-between gap-3 pl-8">
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <div 
                                    className="w-12 h-12 rounded-md bg-gray-200 flex-shrink-0 bg-cover bg-center" 
                                    style={{ backgroundImage: `url(${displayItem.image_url})` }}
                                ></div>
                                <span className="text-sm font-medium truncate">{displayItem.name}</span>
                            </div>
                            {/* --- FIX: RESTORED THE QUANTITY AND REMOVE CONTROLS --- */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => actions.decreaseQuantity(displayItem.product_id)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                    {displayItem.quantity > 1 ? <Minus size={16}/> : <Trash2 size={16} className="text-red-500"/>}
                                </button>
                                <span className="text-md font-semibold w-7 text-center">{displayItem.quantity}</span>
                                <button onClick={() => actions.increaseQuantity(displayItem.product_id)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`bg-blue-600 text-white shadow-xl p-3.5 w-full transition-all duration-300 ${displayItem ? 'rounded-b-xl' : 'rounded-xl'}`}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <ShoppingCart />
                            <span className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                                {totalCartItems}
                            </span>
                        </div>
                        <div className="font-bold text-lg">{formatPrice(totalCartPrice)}</div>
                    </div>
                    <button 
                        onClick={handleViewCart} 
                        className="bg-white text-blue-600 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md"
                    >
                        عرض السلة
                    </button>
                </div>
            </motion.div>
        </div>
    </div>
);
};

export default MiniCartBar;