import React, { createContext, useState, useContext } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter';

const CheckoutContext = createContext();
export const useCheckout = () => useContext(CheckoutContext);

export const CheckoutProvider = ({ children }) => {
    const { openModal, closeModal } = useModal();
    const { cartItems, actions: cartActions, getCartTotal } = useCart();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);
    
    const startCheckout = async (userProfile, telegramUser, onProfileUpdate) => {
        if (!telegramUser?.id || cartItems.length === 0) {
            alert('سلة التسوق فارغة أو لم يتم تسجيل الدخول');
            return;
        }
        
        // Prepare initial form data from user profile and Telegram data
        const initialFormData = {
            fullName: userProfile?.full_name || `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim(),
            phoneNumber: userProfile?.phone_number || '',
            addressLine1: userProfile?.address_line1 || '',
            addressLine2: userProfile?.address_line2 || '',
            city: userProfile?.city || userProfile?.selected_city_name || '',
        };
        
        // Check if user has complete profile
        const hasCompleteProfile = userProfile?.full_name && 
                                 userProfile?.phone_number && 
                                 userProfile?.address_line1 && 
                                 userProfile?.city;
        
        if (hasCompleteProfile) {
            // Show confirmation with option to edit
            openModal('addressConfirmation', {
                profileData: initialFormData,
                onConfirmAndProceed: () => proceedWithOrder(initialFormData, onProfileUpdate),
                onEditAddress: () => showAddressModal(initialFormData, onProfileUpdate),
                onCancel: closeModal
            });
        } else {
            // Show address modal for completion
            showAddressModal(initialFormData, onProfileUpdate);
        }
    };

    const showAddressModal = (initialFormData, onProfileUpdate) => {
        setCheckoutError(null);
        
        openModal('address', {
            initialData: initialFormData,
            onSaveAndProceed: (addressData) => handleSaveAddressAndProceed(addressData, onProfileUpdate),
            error: checkoutError,
            isSaving: isPlacingOrder,
            availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
        });
    };

    const handleSaveAddressAndProceed = async (addressData, onProfileUpdate) => {
        setIsPlacingOrder(true);
        setCheckoutError(null);
        
        try {
            // Save profile first
            await userService.updateProfile({
                full_name: addressData.fullName,
                phone_number: addressData.phoneNumber,
                address_line1: addressData.addressLine1,
                address_line2: addressData.addressLine2,
                city: addressData.city
            });
            
            // Update profile in parent component
            if (onProfileUpdate) {
                await onProfileUpdate();
            }
            
            // Close address modal and proceed with order
            closeModal();
            await proceedWithOrder(addressData, onProfileUpdate);
            
        } catch (err) {
            console.error('Error saving profile:', err);
            setCheckoutError(err.message || 'فشل في حفظ البيانات');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const proceedWithOrder = async (addressData, onProfileUpdate) => {
        setIsPlacingOrder(true);
        setCheckoutError(null);
        
        try {
            const orderData = {
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_time_of_order: item.effective_selling_price,
                    name: item.name // Include name for notification
                })),
                total_amount: getCartTotal(),
                customer_info: {
                    name: addressData.fullName,
                    phone: addressData.phoneNumber,
                    address1: addressData.addressLine1,
                    address2: addressData.addressLine2,
                    city: addressData.city
                }
            };
            
            const orderResult = await orderService.createOrderFromCart(orderData);
            
            // Clear cart
            cartActions.clearCart();
            
            // Emit order placed event for other components
            emitter.emit('order-placed', orderResult);
            
            // Show success modal
            openModal('orderConfirmation', { 
                orderDetails: orderResult,
                customerInfo: addressData
            });
            
            // Telegram haptic feedback
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');
            
        } catch (err) {
            console.error('Order creation error:', err);
            setCheckoutError(err.message || 'فشل في إنشاء الطلب');
            
            // Show error and allow retry
            openModal('address', {
                initialData: addressData,
                onSaveAndProceed: (retryAddressData) => handleSaveAddressAndProceed(retryAddressData, onProfileUpdate),
                error: checkoutError,
                isSaving: false,
                availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
            });
            
            window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const value = { 
        isPlacingOrder, 
        startCheckout,
        checkoutError 
    };
    
    return (
        <CheckoutContext.Provider value={value}>
            {children}
        </CheckoutContext.Provider>
    );
};