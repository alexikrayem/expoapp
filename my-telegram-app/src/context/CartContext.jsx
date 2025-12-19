// src/context/CartContext.jsx (NEW LOCAL STORAGE VERSION)
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useMiniCart } from './MiniCartContext';
import { useToast } from './ToastContext';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const CART_STORAGE_KEY = 'my_app_cart';

export const CartProvider = ({ children }) => {
    const { showMiniCartBar } = useMiniCart();
    const { showToast } = useToast();
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load cart from localStorage only once on initial app load
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                setCartItems(JSON.parse(savedCart));
            }
        } catch (error) {
            console.error('Failed to load cart from storage', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (!isLoading) { // Prevent saving the initial empty state
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        }
    }, [cartItems, isLoading]);

    const addToCart = useCallback((product) => {
        showMiniCartBar(product);
        setCartItems(prevItems => {
            const existing = prevItems.find(item => item.product_id === product.id);
            if (existing) {
                return prevItems.map(item =>
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            // Add all necessary product details for the checkout card
            const newItem = {
                product_id: product.id,
                name: product.name,
                image_url: product.image_url,
                supplier_name: product.supplier_name,
                effective_selling_price: product.effective_selling_price,
                quantity: 1
            };
            return [...prevItems, newItem];
        });

        // Show toast notification
        showToast(`تمت إضافة ${product.name} إلى السلة`, 'success');
    }, [showMiniCartBar, showToast]);

    const increaseQuantity = useCallback((productId) => {
        setCartItems(prev => prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item));
    }, []);

    const decreaseQuantity = useCallback((productId) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.product_id === productId);
            if (existing?.quantity === 1) {
                return prev.filter(item => item.product_id !== productId); // Remove if quantity becomes 0
            }
            return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item);
        });
    }, []);

    const removeItem = useCallback((productId) => {
        setCartItems(prev => prev.filter(item => item.product_id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    const getCartTotal = useCallback(() => cartItems.reduce((sum, item) => sum + (parseFloat(item.effective_selling_price) * item.quantity), 0), [cartItems]);
    const getCartItemCount = useCallback(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    const value = {
        cartItems,
        isLoadingCart: isLoading,
        getCartTotal,
        getCartItemCount,
        actions: { addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart },
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};