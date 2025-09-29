// src/components/cart/MiniCartBar.jsx (ENHANCED VERSION)
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useMiniCart } from '../../context/MiniCartContext';

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

    const handleRemoveItem = (productId) => {
        window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
        actions.removeItem(productId);
        // If this was the active item, hide the panel
        if (displayItem && displayItem.product_id === productId) {
            hideMiniCartBar();
        }
    };

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
                            className="bg-white p-4 shadow-lg rounded-t-xl border-b w-full relative"
                        >
                            <button 
                                onClick={hideMiniCartBar} 
                                className="absolute top-2 left-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={16}/>
                            </button>
                            
                            <div className="flex items-center justify-between gap-3 pl-10">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div 
                                        className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0 bg-cover bg-center shadow-sm" 
                                        style={{ backgroundImage: `url(${displayItem.image_url})` }}
                                    >
                                        {!displayItem.image_url && (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingCart className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-grow">
                                        <h3 className="text-sm font-semibold text-gray-800 truncate">{displayItem.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">{displayItem.supplier_name}</p>
                                        <p className="text-sm font-bold text-blue-600">{formatPrice(displayItem.effective_selling_price)}</p>
                                    </div>
                                </div>
                                
                                {/* Enhanced quantity controls */}
                                <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-lg p-1">
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleQuantityChange(displayItem.product_id, 'decrease')} 
                                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                    >
                                        {displayItem.quantity > 1 ? (
                                            <Minus size={16} className="text-gray-600"/>
                                        ) : (
                                            <Trash2 size={16} className="text-red-500"/>
                                        )}
                                    </motion.button>
                                    
                                    <div className="bg-white rounded-lg px-3 py-2 min-w-[2.5rem] text-center shadow-sm">
                                        <span className="text-sm font-bold text-gray-800">{displayItem.quantity}</span>
                                    </div>
                                    
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleQuantityChange(displayItem.product_id, 'increase')} 
                                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                    >
                                        <Plus size={16} className="text-gray-600"/>
                                    </motion.button>
                                    
                                    {/* Quick remove button */}
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleRemoveItem(displayItem.product_id)} 
                                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors shadow-sm ml-1"
                                        title="إزالة من السلة"
                                    >
                                        <X size={16}/>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`bg-blue-600 text-white shadow-xl p-4 w-full transition-all duration-300 ${displayItem ? 'rounded-b-xl' : 'rounded-xl'}`}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <ShoppingCart className="h-6 w-6" />
                                <motion.span 
                                    key={totalCartItems}
                                    initial={{ scale: 1.5 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold shadow-md"
                                >
                                    {totalCartItems}
                                </motion.span>
                            </div>
                            <div className="font-bold text-lg">{formatPrice(totalCartPrice)}</div>
                        </div>
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleViewCart} 
                            className="bg-white text-blue-600 px-6 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            عرض السلة
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MiniCartBar;