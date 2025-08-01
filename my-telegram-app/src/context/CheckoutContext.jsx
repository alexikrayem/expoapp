// src/context/CheckoutContext.jsx (SIMPLIFIED VERSION)
import React, { createContext, useState, useContext } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter';

const CheckoutContext = createContext();
export const useCheckout = () => useContext(CheckoutContext);

export const CheckoutProvider = ({ children }) => {
    const { openModal } = useModal();
    const { cartItems, actions: cartActions, getCartTotal } = useCart();

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [error, setError] = useState(null);

    const startCheckout = async (userProfile, telegramUser, onProfileUpdate) => {
        if (!telegramUser?.id || cartItems.length === 0) {
            alert('سلة التسوق فارغة أو لم يتم تسجيل الدخول');
            return;
        }
        
        // Check if user has complete profile
        if (userProfile?.full_name && userProfile?.phone_number && userProfile?.address_line1) {
            await placeOrder();
        } else {
            // Show address modal to complete profile
            const formData = {
                fullName: userProfile?.full_name || `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                phoneNumber: userProfile?.phone_number || '',
                addressLine1: userProfile?.address_line1 || '',
                addressLine2: userProfile?.address_line2 || '',
                city: userProfile?.city || userProfile?.selected_city_name || '',
            };
            
            openModal('address', { 
                formData, 
                onFormSubmit: (e) => handleSaveProfileAndPlaceOrder(e, formData, onProfileUpdate),
                onFormChange: (e) => {
                    const { name, value } = e.target;
                    formData[name] = value;
                },
                isSaving: isPlacingOrder,
                error: error,
                availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'] // You can fetch this from your cities API
            });
        }
    };

    const handleSaveProfileAndPlaceOrder = async (e, formData, onProfileUpdate) => {
        e.preventDefault();
        setIsPlacingOrder(true);
        setError(null);
        
        try {
            // Update user profile first
            await userService.updateProfile(formData);
            if (onProfileUpdate) onProfileUpdate();
            
            // Then place the order
            await placeOrder();
        } catch (err) {
            console.error('Error saving profile or placing order:', err);
            setError(err.message || 'فشل في حفظ البيانات أو إنشاء الطلب');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const placeOrder = async () => {
        setIsPlacingOrder(true);
        setError(null);
        
        try {
            // Prepare order data from local cart
            const orderData = {
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_time_of_order: item.effective_selling_price || item.price
                })),
                total_amount: getCartTotal()
            };

            // Send to backend
            const orderResult = await orderService.createOrderFromCart(orderData);
            
            // Clear local cart on success
            cartActions.clearCart();
            
            // Emit event for orders page to refresh
            emitter.emit('order-placed');
            
            // Show success modal
            openModal('orderConfirmation', { orderDetails: orderResult });
            
        } catch (err) {
            console.error('Error placing order:', err);
            setError(err.message || 'فشل في إنشاء الطلب');
            alert(`فشل في إنشاء الطلب: ${err.message}`);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const value = { 
        isPlacingOrder, 
        checkoutError: error, 
        startCheckout 
    };

    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
};