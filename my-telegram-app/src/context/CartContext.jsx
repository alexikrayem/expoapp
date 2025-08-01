// src/context/CartContext.jsx (SIMPLIFIED LOCAL STORAGE VERSION)
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const CART_STORAGE_KEY = 'telegram_app_cart';

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMiniCartItem, setActiveMiniCartItem] = useState(null);
    const [showActiveItemControls, setShowActiveItemControls] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            setCartItems([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save cart to localStorage whenever cartItems changes
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
            } catch (error) {
                console.error('Error saving cart to localStorage:', error);
            }
        }
    }, [cartItems, isLoading]);

    const addToCart = useCallback((product) => {
        const productId = product.id || product.product_id;
        if (!productId) {
            console.error("addToCart failed: product has no id.", product);
            return;
        }

        setActiveMiniCartItem(product);
        setShowActiveItemControls(true);

        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.product_id === productId);
            
            if (existingItem) {
                return prevItems.map(item =>
                    item.product_id === productId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                const newItem = {
                    product_id: productId,
                    name: product.name,
                    price: product.price,
                    discount_price: product.discount_price,
                    effective_selling_price: product.effective_selling_price || 
                        (product.is_on_sale && product.discount_price ? product.discount_price : product.price),
                    image_url: product.image_url,
                    is_on_sale: product.is_on_sale,
                    supplier_name: product.supplier_name,
                    stock_level: product.stock_level,
                    quantity: 1
                };
                return [...prevItems, newItem];
            }
        });
    }, []);

    const increaseQuantity = useCallback((productId) => {
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.product_id === productId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    }, []);

    const decreaseQuantity = useCallback((productId) => {
        setCartItems(prevItems => {
            const item = prevItems.find(item => item.product_id === productId);
            if (!item) return prevItems;

            if (item.quantity <= 1) {
                return prevItems.filter(item => item.product_id !== productId);
            } else {
                return prevItems.map(item =>
                    item.product_id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
        });
    }, []);

    const removeItem = useCallback((productId) => {
        setCartItems(prevItems =>
            prevItems.filter(item => item.product_id !== productId)
        );
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
        localStorage.removeItem(CART_STORAGE_KEY);
    }, []);

    const hideActiveItemControls = useCallback(() => {
        setShowActiveItemControls(false);
        setActiveMiniCartItem(null);
    }, []);

    const getCartTotal = useCallback(() => {
        return cartItems.reduce((total, item) => {
            const price = parseFloat(item.effective_selling_price || item.price || 0);
            return total + (price * item.quantity);
        }, 0);
    }, [cartItems]);

    const getCartItemCount = useCallback(() => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    }, [cartItems]);

    const value = {
        cartItems,
        isLoadingCart: isLoading,
        isCartUpdating: false, // No longer needed since we're not making API calls
        cartError: null, // No longer needed
        activeMiniCartItem,
        showActiveItemControls,
        hideActiveItemControls,
        getCartTotal,
        getCartItemCount,
        actions: {
            addToCart,
            increaseQuantity,
            decreaseQuantity,
            removeItem,
            clearCart,
        }
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};