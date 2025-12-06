import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useMiniCart } from './MiniCartContext';
import { useToast } from './ToastContext';
import { storage } from '../utils/storage';

const CartContext = createContext<any>(null);
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

const CART_STORAGE_KEY = 'my_app_cart';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { showMiniCartBar } = useMiniCart();
    const { showToast } = useToast();
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCart = async () => {
            try {
                const savedCart = await storage.getItem(CART_STORAGE_KEY);
                if (savedCart) {
                    setCartItems(JSON.parse(savedCart));
                }
            } catch (error) {
                console.error('Failed to load cart from storage', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCart();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            storage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        }
    }, [cartItems, isLoading]);

    const addToCart = useCallback((product: any) => {
        showMiniCartBar(product);
        showToast('تم إضافة المنتج إلى السلة', 'success');
        setCartItems(prevItems => {
            const existing = prevItems.find(item => item.product_id === product.id);
            if (existing) {
                return prevItems.map(item =>
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
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
    }, [showMiniCartBar, showToast]);

    const increaseQuantity = useCallback((productId: string) => {
        setCartItems(prev => prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item));
    }, []);

    const decreaseQuantity = useCallback((productId: string) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.product_id === productId);
            if (existing?.quantity === 1) {
                return prev.filter(item => item.product_id !== productId);
            }
            return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item);
        });
    }, []);

    const removeItem = useCallback((productId: string) => {
        setCartItems(prev => prev.filter(item => item.product_id !== productId));
        showToast('تم إزالة المنتج من السلة', 'info');
    }, [showToast]);

    const clearCart = useCallback(() => {
        setCartItems([]);
        showToast('تم إفراغ السلة', 'info');
    }, [showToast]);

    const getCartTotal = useCallback(() => cartItems.reduce((sum, item) => sum + (parseFloat(item.effective_selling_price) * item.quantity), 0), [cartItems]);
    const getCartItemCount = useCallback(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);

    const value = useMemo(() => ({
        cartItems,
        isLoadingCart: isLoading,
        getCartTotal,
        getCartItemCount,
        actions: { addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart },
    }), [cartItems, isLoading, getCartTotal, getCartItemCount, addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
