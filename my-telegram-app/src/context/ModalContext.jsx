// src/context/ModalContext.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

// Import all the modals that this context will manage
import ProductDetailModal from '../components/modals/ProductDetailModal';
import DealDetailModal from '../components/modals/DealDetailModal';
import SupplierDetailModal from '../components/modals/SupplierDetailModal';
import ProfileModal from '../components/modals/ProfileModal';
import AddressModal from '../components/cart/AddressModal';
import AddressConfirmationModal from '../components/modals/AddressConfirmationModal';
import OrderConfirmationModal from '../components/modals/OrderConfirmationModal';
import CartSidebar from '../components/cart/CartSidebar';


const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        type: null, // e.g., 'productDetail', 'profile'
        props: {}   // Props to pass to the currently open modal
    });

    const openModal = useCallback((type, props = {}) => {
         console.log(`[ModalContext.jsx] openModal called with type: "${type}"`, { props });
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        setModalState({ type, props });
    }, []);

    const closeModal = useCallback(() => {
        document.body.style.overflow = 'auto'; // Restore background scrolling
        setModalState({ type: null, props: {} });
    }, []);

    const renderModal = () => {
        const { type, props } = modalState;
         switch (type) {
            case 'productDetail':
                return <ProductDetailModal show={true} onClose={closeModal} {...props} />;
                 case 'dealDetail':
                return <DealDetailModal
                    show={true}
                    onClose={closeModal}
                    onProductClick={(productId) => openModal('productDetail', { productId })}
                    onSupplierClick={(supplierId) => openModal('supplierDetail', { supplierId })}
                    {...props}
                />;
            case 'supplierDetail':
                return <SupplierDetailModal
                    show={true}
                    onClose={closeModal}
                    onProductClick={(productId) => openModal('productDetail', { productId })}
                    {...props}
                />;
            case 'profile':
                return <ProfileModal show={true} onClose={closeModal} {...props} />;
            case 'address':
                return <AddressModal show={true} onClose={closeModal} {...props} />;
            case 'addressConfirmation':
                return <AddressConfirmationModal show={true} onClose={closeModal} {...props} />;
            case 'orderConfirmation':
                return <OrderConfirmationModal show={true} onClose={closeModal} {...props} />;
            case 'cart':
                return <CartSidebar show={true} onClose={closeModal} {...props} />;
            default:
                return null;
        }
    };

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            <AnimatePresence>
                {renderModal()}
            </AnimatePresence>
        </ModalContext.Provider>
    );
};