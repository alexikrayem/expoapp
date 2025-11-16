import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMiniCart } from './MiniCartContext';

const CART_STORAGE_KEY = 'my_app_cart';

interface CartItem {
  product_id: string;
  name: string;
  image_url: string;
  supplier_name: string;
  effective_selling_price: number;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  isLoadingCart: boolean;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  actions: {
    addToCart: (product: any) => void;
    increaseQuantity: (productId: string) => void;
    decreaseQuantity: (productId: string) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showMiniCartBar } = useMiniCart();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from AsyncStorage on initial app load
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
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

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) { // Prevent saving the initial empty state
      const saveCart = async () => {
        try {
          await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
          console.error('Failed to save cart to storage', error);
        }
      };
      saveCart();
    }
  }, [cartItems, isLoading]);

  const addToCart = useCallback((product: any) => {
    showMiniCartBar(product);
    setCartItems(prevItems => {
      const existing = prevItems.find(item => item.product_id === product.id);
      if (existing) {
        return prevItems.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // Add all necessary product details for the checkout card
      const newItem: CartItem = {
        product_id: product.id,
        name: product.name,
        image_url: product.image_url,
        supplier_name: product.supplier_name,
        effective_selling_price: product.effective_selling_price,
        quantity: 1
      };
      return [...prevItems, newItem];
    });
  }, [showMiniCartBar]);

  const increaseQuantity = useCallback((productId: string) => {
    setCartItems(prev => prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item));
  }, []);

  const decreaseQuantity = useCallback((productId: string) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing?.quantity === 1) {
        return prev.filter(item => item.product_id !== productId); // Remove if quantity becomes 0
      }
      return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity - 1 } : item);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (parseFloat(item.effective_selling_price.toString()) * item.quantity), 0);
  }, [cartItems]);

  const getCartItemCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    isLoadingCart: isLoading,
    getCartTotal,
    getCartItemCount,
    actions: { addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};