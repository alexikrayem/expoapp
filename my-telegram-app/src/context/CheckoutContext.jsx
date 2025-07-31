// src/context/CheckoutContext.jsx (CORRECTED WITH EVENT EMITTER)
import React, { createContext, useState, useContext } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter'; // Import the new event emitter

const CheckoutContext = createContext();
export const useCheckout = () => useContext(CheckoutContext);

export const CheckoutProvider = ({ children }) => {
    const { openModal } = useModal();
    const { cartItems, actions: cartActions } = useCart();

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [error, setError] = useState(null);

    // This function is now simpler: it doesn't need to know about refetchOrders.
    const startCheckout = (userProfile, telegramUser, onProfileUpdate) => {
        if (!telegramUser?.id || cartItems.length === 0) return;
        
        if (userProfile?.full_name && userProfile?.phone_number && userProfile?.address_line1) {
            placeOrder();
        } else {
            const formData = {
                fullName: userProfile?.full_name || `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
                phoneNumber: userProfile?.phone_number || '',
                addressLine1: userProfile?.address_line1 || '',
                addressLine2: userProfile?.address_line2 || '',
                city: userProfile?.city || userProfile?.selected_city_name || '',
            };
            openModal('address', { 
                formData, 
                onFormSubmit: (e, data) => handleSaveProfileAndPlaceOrder(e, data, onProfileUpdate),
                isSaving: isPlacingOrder,
                error: error
            });
        }
    };

    const handleSaveProfileAndPlaceOrder = async (e, formData, onProfileUpdate) => {
        e.preventDefault();
        setIsPlacingOrder(true);
        setError(null);
        try {
            await userService.updateProfile(formData);
            onProfileUpdate();
            await placeOrder();
        } catch (err) {
            setError(err.message);
            // Optionally re-open modal with error
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const placeOrder = async () => {
        setIsPlacingOrder(true);
        setError(null);
        try {
            const orderResult = await orderService.createOrder();
            cartActions.clearCartOnFrontend();
            
            // FIX: Instead of calling a function, we emit a global event.
            // Any part of the app can listen for this event.
            emitter.emit('order-placed');
            
            openModal('orderConfirmation', { orderDetails: orderResult });
        } catch (err) {
            alert(`Failed to create order: ${err.message}`);
            setError(err.message);
            openModal(null);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const value = { isPlacingOrder, checkoutError: error, startCheckout };

    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
};