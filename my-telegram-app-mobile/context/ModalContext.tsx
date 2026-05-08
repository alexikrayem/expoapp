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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openModal: (type: string, props?: Record<string, any>) => void;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [modalState, setModalState] = useState<{ type: string | null; props: Record<string, any> }>({
        type: null,
        props: {}
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openModal = useCallback((type: string, props: Record<string, any> = {}) => {
        setModalState({ type, props });
    }, []);

    const closeModal = useCallback(() => {
        setModalState({ type: null, props: {} });
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderModalContent = (type: string, props: Record<string, any>) => {
        switch (type) {
            case 'productDetail':
                return <ProductDetailModal {...(props as unknown as React.ComponentProps<typeof ProductDetailModal>)} show={true} onClose={closeModal} />;
            case 'profile':
                return <ProfileModal {...(props as unknown as React.ComponentProps<typeof ProfileModal>)} visible={true} onClose={closeModal} />;
            case 'address':
                return <AddressModal {...(props as unknown as React.ComponentProps<typeof AddressModal>)} visible={true} onClose={closeModal} />;
            case 'addressConfirmation':
                return <AddressConfirmationModal {...(props as unknown as React.ComponentProps<typeof AddressConfirmationModal>)} visible={true} onClose={closeModal} />;
            case 'orderConfirmation':
                return <OrderConfirmationModal {...(props as unknown as React.ComponentProps<typeof OrderConfirmationModal>)} visible={true} onClose={closeModal} />;
            case 'dealDetail':
                return <DealDetailModal {...(props as unknown as React.ComponentProps<typeof DealDetailModal>)} show={true} onClose={closeModal} />;
            case 'supplierDetail':
                return <SupplierDetailModal {...(props as unknown as React.ComponentProps<typeof SupplierDetailModal>)} show={true} onClose={closeModal} />;
            case 'featuredList':
                return <FeaturedListModal {...(props as unknown as React.ComponentProps<typeof FeaturedListModal>)} show={true} onClose={closeModal} openModal={openModal as unknown as (type: string, props?: unknown) => void} />;
            case 'feedback':
                return <FeedbackModal {...(props as unknown as React.ComponentProps<typeof FeedbackModal>)} visible={true} onClose={closeModal} />;
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

