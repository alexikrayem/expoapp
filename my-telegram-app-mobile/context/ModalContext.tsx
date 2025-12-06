import React, { createContext, useState, useContext, useCallback } from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import ProductDetailModal from '../components/modals/ProductDetailModal';
import ProfileModal from '../components/modals/ProfileModal';
import AddressModal from '../components/modals/AddressModal';
import AddressConfirmationModal from '../components/modals/AddressConfirmationModal';
import OrderConfirmationModal from '../components/modals/OrderConfirmationModal';
import DealDetailModal from '../components/modals/DealDetailModal';
import SupplierDetailModal from '../components/modals/SupplierDetailModal';
import FeaturedListModal from '../components/modals/FeaturedListModal';
import FeedbackModal from '../components/modals/FeedbackModal';

// Define the context shape
interface ModalContextType {
    openModal: (type: string, props?: any) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [modalState, setModalState] = useState<{ type: string | null; props: any }>({
        type: null,
        props: {}
    });

    const openModal = useCallback((type: string, props = {}) => {
        console.log(`[ModalContext] openModal called with type: "${type}"`, props);
        setModalState({ type, props });
    }, []);

    const closeModal = useCallback(() => {
        setModalState({ type: null, props: {} });
    }, []);

    const renderModal = () => {
        const { type, props } = modalState;

        switch (type) {
            case 'productDetail':
                return <ProductDetailModal show={true} onClose={closeModal} {...props} />;
            case 'profile':
                return <ProfileModal visible={true} onClose={closeModal} {...props} />;
            case 'address':
                return <AddressModal visible={true} onClose={closeModal} {...props} />;
            case 'addressConfirmation':
                return <AddressConfirmationModal visible={true} onClose={closeModal} {...props} />;
            case 'orderConfirmation':
                return <OrderConfirmationModal visible={true} onClose={closeModal} {...props} />;
            case 'dealDetail':
                return <DealDetailModal show={true} onClose={closeModal} {...props} />;
            case 'supplierDetail':
                return <SupplierDetailModal show={true} onClose={closeModal} {...props} />;
            case 'featuredList':
                return <FeaturedListModal show={true} onClose={closeModal} {...props} />;
            case 'feedback':
                return <FeedbackModal visible={true} onClose={closeModal} {...props} />;
            default:
                return null;
        }
    };

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {renderModal()}
        </ModalContext.Provider>
    );
};


