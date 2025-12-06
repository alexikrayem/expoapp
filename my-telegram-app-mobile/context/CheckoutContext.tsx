import React, { createContext, useState, useContext } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter';

const CheckoutContext = createContext<any>(null);
export const useCheckout = () => {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckout must be used within CheckoutProvider');
    }
    return context;
};

export const CheckoutProvider = ({ children }: { children: React.ReactNode }) => {
    const { openModal, closeModal } = useModal();
    const { cartItems, actions: cartActions, getCartTotal } = useCart();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const startCheckout = async (userProfile: any, telegramUser: any, onProfileUpdate: any) => {
        const isAuthenticated = telegramUser?.id || (userProfile && userProfile.userId);
        if (!isAuthenticated || cartItems.length === 0) {
            alert('سلة التسوق فارغة أو لم يتم تسجيل الدخول');
            return;
        }

        const initialFormData = {
            fullName: userProfile?.full_name || `${telegramUser?.first_name || ''} ${telegramUser?.last_name || ''}`.trim(),
            phoneNumber: userProfile?.phone_number || '',
            addressLine1: userProfile?.address_line1 || '',
            addressLine2: userProfile?.address_line2 || '',
            city: userProfile?.city || userProfile?.selected_city_name || '',
        };

        const hasCompleteProfile = userProfile?.full_name &&
            userProfile?.phone_number &&
            userProfile?.address_line1 &&
            userProfile?.city;

        if (hasCompleteProfile) {
            openModal('addressConfirmation', {
                profileData: initialFormData,
                onConfirmAndProceed: () => proceedWithOrder(initialFormData, onProfileUpdate),
                onEditAddress: () => showAddressModal(initialFormData, onProfileUpdate),
                onCancel: closeModal
            });
        } else {
            showAddressModal(initialFormData, onProfileUpdate);
        }
    };

    const showAddressModal = (initialFormData: any, onProfileUpdate: any) => {
        setCheckoutError(null);

        openModal('address', {
            initialData: initialFormData,
            onSaveAndProceed: (addressData: any) => handleSaveAddressAndProceed(addressData, onProfileUpdate),
            error: checkoutError,
            isSaving: isPlacingOrder,
            availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
        });
    };

    const handleSaveAddressAndProceed = async (addressData: any, onProfileUpdate: any) => {
        setIsPlacingOrder(true);
        setCheckoutError(null);

        try {
            await userService.updateProfile({
                full_name: addressData.fullName,
                phone_number: addressData.phoneNumber,
                address_line1: addressData.addressLine1,
                address_line2: addressData.addressLine2,
                city: addressData.city
            });

            if (onProfileUpdate) {
                await onProfileUpdate();
            }

            closeModal();
            await proceedWithOrder(addressData, onProfileUpdate);

        } catch (err: any) {
            console.error('Error saving profile:', err);
            setCheckoutError(err.message || 'فشل في حفظ البيانات');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const proceedWithOrder = async (addressData: any, onProfileUpdate: any) => {
        setIsPlacingOrder(true);
        setCheckoutError(null);

        try {
            const orderData = {
                items: cartItems.map((item: any) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_time_of_order: item.effective_selling_price,
                    name: item.name
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

            cartActions.clearCart();

            emitter.emit('order-placed', orderResult);

            openModal('orderConfirmation', {
                orderDetails: orderResult,
                customerInfo: addressData
            });

            // Haptic feedback placeholder
            // window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('success');

        } catch (err: any) {
            console.error('Order creation error:', err);

            // Handle specific errors
            if (err.status === 409 || err.message?.includes('Insufficient stock')) {
                setCheckoutError(`عذراً، بعض المنتجات نفدت من المخزون: ${err.message}`);
                // Do not re-open address modal for stock errors
                // Optionally refresh cart or remove item here if logic permits
            } else {
                setCheckoutError(err.message || 'فشل في إنشاء الطلب');

                // Only re-open address modal for other errors (likely validation/address related)
                openModal('address', {
                    initialData: addressData,
                    onSaveAndProceed: (retryAddressData: any) => handleSaveAddressAndProceed(retryAddressData, onProfileUpdate),
                    error: checkoutError,
                    isSaving: false,
                    availableCities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah']
                });
            }

            // Haptic feedback placeholder
            // window.Telegram?.WebApp?.HapticFeedback.notificationOccurred('error');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const value = {
        isPlacingOrder,
        startCheckout,
        placeOrder: proceedWithOrder,
        checkoutError
    };

    return (
        <CheckoutContext.Provider value={value}>
            {children}
        </CheckoutContext.Provider>
    );
};
