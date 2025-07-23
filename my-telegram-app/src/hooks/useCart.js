// src/hooks/useCart.js (FINAL ROBUST VERSION)
import { useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';

export const useCart = (telegramUser) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const optimisticallyUpdateCart = async (action, optimisticUpdateFn) => {
        const previousCart = [...cartItems];
        setCartItems(optimisticUpdateFn(previousCart));
        
        try {
            await action();
            const updatedCart = await cartService.getCart();
            setCartItems(updatedCart || []);
        } catch (err) {
            console.error("Optimistic cart update failed. Rolling back.", err);
            setCartItems(previousCart);
            // Construct a more helpful alert
            const errorMsg = err.error || err.message || "An unknown error occurred.";
            alert(`Error updating cart: ${errorMsg}`);
        }
    };

    // For adding a NEW item to the cart
    const addToCart = (product) => {
        const productId = product.id || product.product_id;
        if (!productId) {
            console.error("addToCart failed: product has no id.", product);
            return;
        }

        const optimisticUpdateFn = (currentCart) => {
            const existingItem = currentCart.find(item => item.product_id === productId);
            if (existingItem) {
                return currentCart.map(item => 
                    item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...currentCart, {
                    ...product,
                    product_id: productId,
                    quantity: 1,
                    effective_selling_price: product.effective_selling_price || product.price,
                }];
            }
        };
        optimisticallyUpdateCart(() => cartService.addToCart(productId, 1), optimisticUpdateFn);
    };

    // For increasing quantity of an EXISTING item
    const increaseQuantity = (productId) => {
        if (!productId) return;
        const optimisticUpdateFn = (currentCart) => currentCart.map(item => 
            item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
        // The backend POST route handles both adding and increasing, so this is correct.
        optimisticallyUpdateCart(() => cartService.addToCart(productId, 1), optimisticUpdateFn);
    };

    const decreaseQuantity = (productId) => {
        if (!productId) return;
        const itemInCart = cartItems.find(item => item.product_id === productId);
        if (!itemInCart) return;

        if (itemInCart.quantity <= 1) {
            removeItem(productId);
        } else {
            const optimisticUpdateFn = (currentCart) => currentCart.map(item => 
                item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item
            );
            optimisticallyUpdateCart(() => cartService.updateCartItem(productId, itemInCart.quantity - 1), optimisticUpdateFn);
        }
    };

    const removeItem = (productId) => {
        if (!productId) return;
        const optimisticUpdateFn = (currentCart) => currentCart.filter(item => item.product_id !== productId);
        optimisticallyUpdateCart(() => cartService.removeCartItem(productId), optimisticUpdateFn);
    };

 const afterOrderPlacement = () => {
        // This function doesn't need to call the backend.
        // It just clears the cart state on the frontend, which is what we want.
        setCartItems([]);
    };

    const fetchCart = useCallback(async () => {
        if (!telegramUser?.id) {
            setCartItems([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await cartService.getCart();
            setCartItems(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [telegramUser?.id]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    return {
        cartItems,
        isLoadingCart: isLoading,
        cartError: error,
        actions: { addToCart, increaseQuantity, decreaseQuantity, removeItem, afterOrderPlacement },
    };
};