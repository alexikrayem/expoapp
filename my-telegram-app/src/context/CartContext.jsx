// src/context/CartContext.jsx (DEFINITIVE CORRECTED VERSION)
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    // --- THIS IS THE FIX ---
    // We define `telegramUser` here so the rest of the component can access it.
    // This works both inside Telegram and in a local browser for testing.
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user || { id: 123456789, first_name: 'Dev' };
   
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);
    
    const [activeMiniCartItem, setActiveMiniCartItem] = useState(null);
    const [showActiveItemControls, setShowActiveItemControls] = useState(false);

    const fetchCart = useCallback(async () => {
        // Now, this `telegramUser` variable exists and can be safely used.
        if (!telegramUser?.id) {
            setCartItems([]);
            setIsLoading(false);
            return;
        }
        if (isLoading) setIsLoading(true);
        try {
            const data = await cartService.getCart();
            setCartItems(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [telegramUser?.id, isLoading]); // The dependency is now valid.

    useEffect(() => { fetchCart(); }, [fetchCart]);

    const performCartAction = useCallback(async (action) => {
        setIsUpdating(true);
        try {
            await action();
            await fetchCart();
        } catch (err) {
            console.error("Cart action failed:", err);
            alert(`Error: ${err.message || 'An unknown error occurred'}`);
        } finally {
            setIsUpdating(false);
        }
    }, [fetchCart]);

    const addToCart = (product) => {
        setActiveMiniCartItem(product);
        setShowActiveItemControls(true);
        performCartAction(() => cartService.addToCart(product.id, 1));
    };

    const hideActiveItemControls = () => {
        setShowActiveItemControls(false);
    };

    const increaseQuantity = (productId) => performCartAction(() => cartService.addToCart(productId, 1));
    const removeItem = (productId) => performCartAction(() => cartService.removeCartItem(productId));
    const decreaseQuantity = (productId) => {
        const item = cartItems.find(i => i.product_id === productId);
        if (item && item.quantity > 1) {
            performCartAction(() => cartService.updateCartItem(productId, item.quantity - 1));
        } else {
            removeItem(productId);
        }
    };
    
    const clearCartOnFrontend = () => setCartItems([]);

    const value = {
        cartItems,
        isLoadingCart: isLoading,
        isCartUpdating: isUpdating,
        cartError: error,
        activeMiniCartItem,
        showActiveItemControls,
        hideActiveItemControls,
        actions: {
            addToCart,
            increaseQuantity,
            decreaseQuantity,
            removeItem,
            fetchCart,
            clearCartOnFrontend,
        }
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};