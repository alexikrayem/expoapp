// src/hooks/useCart.js
import { useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';

export const useCart = (telegramUser) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingUpdate, setPendingUpdate] = useState(false);

    const fetchCart = useCallback(async () => {
        if (!telegramUser?.id) {
            // If no user, reset the cart state
            setCartItems([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await cartService.getCart(); // Secure - no userId needed
            setCartItems(data || []);
        } catch (err) {
            console.error("Failed to fetch cart:", err);
            setError(err.message);
            setCartItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [telegramUser?.id]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);
    
    const performCartAction = useCallback(async (action) => {
        setPendingUpdate(true);
        try {
            await action();
            // After any successful action, we refetch the entire cart
            // to ensure the state is perfectly in sync with the backend.
            await fetchCart();
        } catch (err) {
            console.error("Cart action failed:", err);
            // Optionally, show an alert to the user
            alert(`Error updating cart: ${err.message}`);
            // Refetch the cart even on error to revert to the correct state
            await fetchCart();
        } finally {
            setPendingUpdate(false);
        }
    }, [fetchCart]);
    
    const addToCart = (product) => {
        performCartAction(() => cartService.addToCart(product.id, 1));
    };

    const increaseQuantity = (productId) => {
        performCartAction(() => cartService.addToCart(productId, 1));
    };

    const decreaseQuantity = async (productId) => {
        const itemInCart = cartItems.find(item => item.product_id === productId);
        if (!itemInCart) return;

        // If quantity is 1, it becomes a remove operation.
        const newQuantity = itemInCart.quantity - 1;
        if (newQuantity <= 0) {
            await removeItem(productId);
        } else {
            await updateItemQuantity(productId, newQuantity);
        }
    };
    
    const updateItemQuantity = (productId, newQuantity) => {
        performCartAction(() => cartService.updateCartItem(productId, newQuantity));
    };

    const removeItem = (productId) => {
        performCartAction(() => cartService.removeCartItem(productId));
    };

    return {
        cartItems,
        isLoadingCart: isLoading,
        cartError: error,
        isCartUpdating: pendingUpdate,
        actions: {
            addToCart,
            increaseQuantity,
            decreaseQuantity,
            removeItem,
            fetchCart,
        },
    };
};