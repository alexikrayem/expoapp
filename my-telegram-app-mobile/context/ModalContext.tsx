import React, { createContext, useState, useContext, useCallback, useMemo, Suspense } from 'react';

// Lazy-load modals — each modal's JS is only parsed when first opened,
// reducing app startup time and memory pressure on lower-end devices.
const ProductDetailModal = React.lazy(() => import('../components/modals/ProductDetailModal'));
const ProfileModal = React.lazy(() => import('../components/modals/ProfileModal'));
const AddressModal = React.lazy(() => import('../components/modals/AddressModal'));
const AddressConfirmationModal = React.lazy(() => import('../components/modals/AddressConfirmationModal'));
const OrderConfirmationModal = React.lazy(() => import('../components/modals/OrderConfirmationModal'));
const DealDetailModal = React.lazy(() => import('../components/modals/DealDetailModal'));
const SupplierDetailModal = React.lazy(() => import('../components/modals/SupplierDetailModal'));
const FeaturedListModal = React.lazy(() => import('../components/modals/FeaturedListModal'));
const FeedbackModal = React.lazy(() => import('../components/modals/FeedbackModal'));

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
        setModalState({ type, props });
    }, []);

    const closeModal = useCallback(() => {
        setModalState({ type: null, props: {} });
    }, []);

    const renderModalContent = (type: string, props: any) => {
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
                return <FeaturedListModal show={true} onClose={closeModal} openModal={openModal} {...props} />;
            case 'feedback':
                return <FeedbackModal visible={true} onClose={closeModal} {...props} />;
            default:
                return null;
        }
    };

    const renderModal = () => {
        const { type, props } = modalState;
        if (!type) return null;

        return (
            <Suspense fallback={null}>
                {renderModalContent(type, props)}
            </Suspense>
        );
    };

    const value = useMemo(() => ({ openModal, closeModal }), [openModal, closeModal]);

    return (
        <ModalContext.Provider value={value}>
            {children}
            {renderModal()}
        </ModalContext.Provider>
    );
};

