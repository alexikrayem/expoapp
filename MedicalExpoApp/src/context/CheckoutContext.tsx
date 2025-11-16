import React, { createContext, useState, useContext, useCallback } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { apiClient } from '../services/apiClient';

interface CheckoutContextType {
  isPlacingOrder: boolean;
  startCheckout: (userProfile: any, onProfileUpdate?: () => Promise<void>) => void;
  checkoutError: string | null;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { openModal, closeModal } = useModal();
  const { cartItems, actions: cartActions, getCartTotal } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const startCheckout = useCallback(async (userProfile: any, onProfileUpdate?: () => Promise<void>) => {
    if (!userProfile || cartItems.length === 0) {
      alert('Cart is empty or not logged in');
      return;
    }

    // Prepare initial form data from user profile
    const initialFormData = {
      fullName: userProfile.full_name || userProfile.username || '',
      phoneNumber: userProfile.phone_number || '',
      addressLine1: userProfile.address_line1 || '',
      addressLine2: userProfile.address_line2 || '',
      city: userProfile.city || userProfile.selected_city_name || '',
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
  }, [cartItems, openModal, cartActions, getCartTotal]);

  const showAddressModal = useCallback((initialFormData: any, onProfileUpdate?: () => Promise<void>) => {
    setCheckoutError(null);

    openModal('address', {
      initialData: initialFormData,
      onSaveAndProceed: (addressData: any) => handleSaveAddressAndProceed(addressData, onProfileUpdate),
      error: checkoutError,
      isSaving: isPlacingOrder,
      availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
    });
  }, [openModal, checkoutError, isPlacingOrder]);

  const handleSaveAddressAndProceed = useCallback(async (addressData: any, onProfileUpdate?: () => Promise<void>) => {
    setIsPlacingOrder(true);
    setCheckoutError(null);

    try {
      // Save profile first - using the API client
      const profileUpdateResponse = await apiClient.put('/user/profile', {
        full_name: addressData.fullName,
        phone_number: addressData.phoneNumber,
        address_line1: addressData.addressLine1,
        address_line2: addressData.addressLine2,
        city: addressData.city
      });

      if (!profileUpdateResponse.success) {
        throw new Error(profileUpdateResponse.error || 'Failed to update profile');
      }

      // Update profile in parent component
      if (onProfileUpdate) {
        await onProfileUpdate();
      }

      // Close address modal and proceed with order
      closeModal();
      await proceedWithOrder(addressData, onProfileUpdate);

    } catch (err: any) {
      console.error('Error saving profile:', err);
      setCheckoutError(err.message || 'Failed to save profile data');
    } finally {
      setIsPlacingOrder(false);
    }
  }, [closeModal]);

  const proceedWithOrder = useCallback(async (addressData: any, onProfileUpdate?: () => Promise<void>) => {
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

      const orderResult = await apiClient.post('/orders/create', orderData);
      
      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      // Clear cart
      cartActions.clearCart();

      // Show success modal
      openModal('orderConfirmation', {
        orderDetails: orderResult.data,
        customerInfo: addressData
      });

    } catch (err: any) {
      console.error('Order creation error:', err);
      setCheckoutError(err.message || 'Failed to create order');

      // Show error and allow retry
      openModal('address', {
        initialData: addressData,
        onSaveAndProceed: (retryAddressData: any) => handleSaveAddressAndProceed(retryAddressData, onProfileUpdate),
        error: checkoutError,
        isSaving: false,
        availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
      });
    } finally {
      setIsPlacingOrder(false);
    }
  }, [cartItems, getCartTotal, cartActions, openModal, checkoutError, handleSaveAddressAndProceed]);

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