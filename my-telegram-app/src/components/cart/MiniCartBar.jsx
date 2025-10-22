// src/components/cart/MiniCartBar.jsx (ENHANCED VERSION - Stronger Square Card Shadow)
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useMiniCart } from '../../context/MiniCartContext';

const MiniCartBar = () => {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = React.useState(false);
    
    // Data and actions for the cart's content come from CartContext
    const { cartItems, getCartTotal, getCartItemCount, actions } = useCart();
    
    // State and actions for the bar's visibility come from MiniCartContext
    const { activeMiniCartItem, showActiveItemControls, hideMiniCartBar } = useMiniCart();

    const toggleExpand = () => {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        setIsExpanded(prev => !prev);
    };

    if (!cartItems || cartItems.length === 0) {
        return null;
    }

    const totalCartPrice = getCartTotal();
    const totalCartItems = getCartItemCount();

    // Derive the item to display in the top "active item" panel (now part of the Square Card)
    let displayItem = null;
    if (activeMiniCartItem) { 
        const activeItemId = activeMiniCartItem.id || activeMiniCartItem.product_id;
        displayItem = cartItems.find(item => item.product_id === activeItemId);
    }
    
    // Determine if we should show the full Square Card or just the Blue Bar
    // The Square Card is shown IF there's an active item AND its controls are explicitly enabled
    const showSquareCard = displayItem && showActiveItemControls;

    const handleViewCart = () => {
        // When viewing the cart, first hide the temporary active item panel (if it was visible)
        // This will transition from Square Card to Blue Bar if showSquareCard was true.
        hideMiniCartBar(); 
        // Then navigate to the orders page
        navigate('/orders');
    };

    const handleAddMoreItems = () => {
        // This button's purpose is to switch from the Square Card back to the Blue Bar
        // so the user can see total and add more items.
        hideMiniCartBar(); // This will effectively set showActiveItemControls to false
    };

    const handleQuantityChange = (productId, action) => {
        // FIX 2: Add optional chaining for HapticFeedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        if (action === 'increase') {
            actions.increaseQuantity(productId);
        } else if (action === 'decrease') {
            // This button now only decreases, the remove action is separate
            actions.decreaseQuantity(productId);
        }
        // The 'remove' action is now handled by the dedicated removeItem button.
    };

    const handleRemoveItem = (productId) => {
        // FIX 2: Add optional chaining for HapticFeedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        actions.removeItem(productId);
        // If the removed item was the one displayed in the card, hide the card to switch to the bar
        if (displayItem && displayItem.product_id === productId) {
            hideMiniCartBar();
        }
    };

    return (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex flex-col items-center pointer-events-none" dir="rtl">
            <div className="w-full max-w-4xl px-3 sm:px-4 pointer-events-auto">
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: 20, height: 0 }}
                            className="bg-white rounded-t-xl shadow-xl w-full mb-2 overflow-hidden"
                        >
                            <div className="max-h-64 overflow-y-auto p-4">
                                <div className="space-y-3">
                                    {cartItems.map((item) => (
                                        <div key={item.product_id} className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                            <div 
                                                className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 bg-cover bg-center" 
                                                style={{ backgroundImage: `url(${item.image_url})` }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm text-gray-800 truncate">{item.name}</h4>
                                                <p className="text-sm text-gray-500">{formatPrice(item.effective_selling_price)} × {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleQuantityChange(item.product_id, 'decrease')}
                                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                                >
                                                    {item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                                                </button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleQuantityChange(item.product_id, 'increase')}
                                                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {showSquareCard ? (
                        // === SQUARE CARD LAYOUT ===
                        <motion.div
                            key="square-card-view"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            layout
                            // FIX: Changed shadow-lg to shadow-xl for a more pronounced shadow
                            className="bg-white p-4 shadow-xl rounded-xl w-full relative transition-colors duration-300"
                        >
                            {/* Close button for the card */}
                            <button 
                                onClick={hideMiniCartBar} 
                                className="absolute top-2 left-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={16}/>
                            </button>
                            
                            <div className="flex items-start gap-3 pl-10">
                                {/* Product Thumbnail */}
                                <div 
                                    className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 bg-cover bg-center shadow-sm" 
                                    style={{ backgroundImage: `url(${displayItem.image_url})` }}
                                >
                                    {!displayItem.image_url && (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ShoppingCart className="h-7 w-7 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {/* Product Name, Supplier, and Price Info */}
                                <div className="min-w-0 flex-grow pt-1">
                                    <h3 className="text-base font-bold text-gray-800 truncate">{displayItem.name}</h3>
                                    <p className="text-sm text-gray-500 truncate mt-1">{displayItem.supplier_name}</p> 
                                    
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <p className="text-md text-gray-600">السعر للوحدة:</p>
                                        <p className="text-lg font-bold text-blue-600">{formatPrice(displayItem.effective_selling_price)}</p>
                                    </div>
                                    {/* Display total for THIS item if quantity > 1 */}
                                    {displayItem.quantity > 1 && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            <span className="font-semibold text-gray-700">{displayItem.quantity}</span> قطعة * {formatPrice(displayItem.effective_selling_price)} = <span className="font-bold text-gray-800">{formatPrice(displayItem.quantity * displayItem.effective_selling_price)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Quantity Controls with STANDALONE Remove button */}
                            <div className="flex items-center justify-center mt-4">
                                {/* STANDALONE Remove (Trash) Button - Always visible */}
                                <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleRemoveItem(displayItem.product_id)} 
                                    className="p-3 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                    title="إزالة من السلة"
                                >
                                    <Trash2 size={20}/>
                                </motion.button>

                                {/* Quantity +/- and count display (grouped together) */}
                                <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-lg p-1 mr-3">
                                    {/* Decrease Quantity Button - Always Minus icon, disabled if quantity is 1 */}
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleQuantityChange(displayItem.product_id, 'decrease')} 
                                        className={`p-2 bg-white rounded-lg transition-colors shadow-sm 
                                                    ${displayItem.quantity === 1 ? 'text-gray-400 cursor-not-allowed opacity-60' : 'hover:bg-gray-100 text-gray-600'}`}
                                        disabled={displayItem.quantity === 1} // Disable when quantity is 1
                                    >
                                        <Minus size={18}/> {/* Always Minus icon */}
                                    </motion.button>
                                    
                                    {/* Quantity Display */}
                                    <div className="bg-white rounded-lg px-4 py-2 min-w-[3rem] text-center shadow-sm">
                                        <span className="text-base font-bold text-gray-800">{displayItem.quantity}</span>
                                    </div>
                                    
                                    {/* Increase Quantity Button */}
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleQuantityChange(displayItem.product_id, 'increase')} 
                                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                    >
                                        <Plus size={18} className="text-gray-600"/>
                                    </motion.button>
                                </div>
                            </div>

                            {/* Two Action Buttons for Square Card */}
                            <div className="flex gap-3 mt-5">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleAddMoreItems} // Hides card, shows blue bar
                                    className="flex-1 bg-gray-100 text-gray-800 px-4 py-3 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    اضافة عناصر اخرى
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleViewCart} // Hides card and navigates
                                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    عرض الطلبات
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : (
                        // === BLUE BAR LAYOUT ===
                        <motion.div
                            key="blue-bar-view"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            layout
                            className="bg-blue-600 text-white shadow-xl p-4 w-full rounded-xl transition-colors duration-300"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
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
                                        <motion.button
                                            onClick={toggleExpand}
                                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <svg 
                                                className="w-4 h-4 text-white opacity-75"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 15l7-7 7 7"
                                                />
                                            </svg>
                                        </motion.button>
                                    </div>
                                    {/* Informative text for Blue Bar */}
                                    <div className="flex flex-col items-start"> 
                                        <div className="font-bold text-lg">{formatPrice(totalCartPrice)}</div>
                                        {totalCartItems > 0 && ( 
                                            <div className="text-xs text-blue-100 mt-0.5">
                                                {totalCartItems} {totalCartItems === 1 ? 'منتج في السلة' : 'منتجات في السلة'}
                                            </div>
                                        )}
                                    </div>
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
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MiniCartBar;