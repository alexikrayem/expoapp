import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { useModal } from './ModalContext';
import { useCart } from './CartContext';
import { userService } from '../services/userService';
import { orderService } from '../services/orderService';
import { emitter } from '../utils/emitter';
import { UserProfile } from '@/types';

interface AddressData {
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
}

interface CheckoutContextType {
    isPlacingOrder: boolean;
    startCheckout: (
        userProfile: UserProfile | null,
        telegramUser: { id?: string | number; first_name?: string; last_name?: string } | null,
        onProfileUpdate?: () => Promise<void>,
    ) => Promise<void>;
    placeOrder: (addressData: AddressData, onProfileUpdate?: () => Promise<void>) => Promise<void>;
    checkoutError: string | null;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);
export const useCheckout = () => {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckout must be used within CheckoutProvider');
    }
    return context;
};

const AVAILABLE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al-Quwain', 'Ras Al-Khaimah', 'Fujairah'];

export const CheckoutProvider = ({ children }: { children: React.ReactNode }) => {
    const { openModal, closeModal } = useModal();
    const { cartItems, actions: cartActions, getCartTotal } = useCart();
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const proceedWithOrder = useCallback(async (addressData: AddressData, onProfileUpdate?: () => Promise<void>) => {
        setIsPlacingOrder(true);
        setCheckoutError(null);

        try {
            const orderData = {
                items: cartItems.map((item: { product_id: string; quantity: number; effective_selling_price: string; name: string }) => ({
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

        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            console.error('Order creation error:', error);
            const errorMessage = error.message || 'فشل في إنشاء الطلب';

            if (error.status === 409 || error.message?.includes('Insufficient stock')) {
                setCheckoutError(`عذراً، بعض المنتجات نفدت من المخزون: ${errorMessage}`);
            } else {
                setCheckoutError(errorMessage);
                showAddressModal(addressData, onProfileUpdate, errorMessage, false);
            }
        } finally {
            setIsPlacingOrder(false);
        }
    }, [cartItems, getCartTotal, cartActions, openModal]);

    const handleSaveAddressAndProceed = useCallback(async (addressData: AddressData, onProfileUpdate?: () => Promise<void>) => {
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

        } catch (err: unknown) {
            const error = err as { message?: string };
            console.error('Error saving profile:', error);
            const errorMessage = error.message || 'فشل في حفظ البيانات';
            setCheckoutError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsPlacingOrder(false);
        }
    }, [closeModal, proceedWithOrder]);

    const showAddressModal = useCallback((
        initialFormData: AddressData,
        onProfileUpdate?: () => Promise<void>,
        errorMessage: string | null = null,
        saving: boolean = false
    ) => {
        setCheckoutError(null);

        openModal('address', {
            initialData: initialFormData,
            onSaveAndProceed: (addressData: AddressData) => handleSaveAddressAndProceed(addressData, onProfileUpdate),
            error: errorMessage,
            isSaving: saving,
            availableCities: AVAILABLE_CITIES
        });
    }, [openModal, handleSaveAddressAndProceed]);

    const startCheckout = useCallback(async (
        userProfile: UserProfile | null,
        telegramUser: { id?: string | number; first_name?: string; last_name?: string } | null,
        onProfileUpdate?: () => Promise<void>,
    ) => {
        const isAuthenticated = telegramUser?.id || (userProfile && userProfile.id);
        if (!isAuthenticated || cartItems.length === 0) {
            alert('سلة التسوق فارغة أو لم يتم تسجيل الدخول');
            return;
        }

        setCheckoutError(null);

        const initialFormData: AddressData = {
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
    }, [cartItems, openModal, closeModal, proceedWithOrder, showAddressModal]);

    const value = useMemo(() => ({
        isPlacingOrder,
        startCheckout,
        placeOrder: proceedWithOrder,
        checkoutError
    }), [isPlacingOrder, startCheckout, proceedWithOrder, checkoutError]);

    return (
        <CheckoutContext.Provider value={value}>
            {children}
        </CheckoutContext.Provider>
    );
};

