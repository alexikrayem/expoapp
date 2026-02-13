import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock all the modal components to avoid importing the full component tree
vi.mock('../components/modals/ProductDetailModal', () => ({
    default: () => <div data-testid="product-modal">Product Modal</div>
}));
vi.mock('../components/modals/DealDetailModal', () => ({
    default: () => <div data-testid="deal-modal">Deal Modal</div>
}));
vi.mock('../components/modals/SupplierDetailModal', () => ({
    default: () => <div data-testid="supplier-modal">Supplier Modal</div>
}));
vi.mock('../components/modals/ProfileModal', () => ({
    default: () => <div data-testid="profile-modal">Profile Modal</div>
}));
vi.mock('../components/cart/AddressModal', () => ({
    default: () => <div data-testid="address-modal">Address Modal</div>
}));
vi.mock('../components/modals/AddressConfirmationModal', () => ({
    default: () => <div data-testid="address-confirm-modal">Address Confirm</div>
}));
vi.mock('../components/modals/OrderConfirmationModal', () => ({
    default: () => <div data-testid="order-confirm-modal">Order Confirm</div>
}));
vi.mock('../components/cart/CartSidebar', () => ({
    default: () => <div data-testid="cart-sidebar">Cart Sidebar</div>
}));

import { ModalProvider, useModal } from '../context/ModalContext';

describe('ModalContext', () => {
    const originalBodyStyle = document.body.style.overflow;

    afterEach(() => {
        document.body.style.overflow = originalBodyStyle;
    });

    it('provides openModal and closeModal functions', () => {
        const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;
        const { result } = renderHook(() => useModal(), { wrapper });

        expect(typeof result.current.openModal).toBe('function');
        expect(typeof result.current.closeModal).toBe('function');
    });

    it('openModal sets body overflow to hidden', () => {
        const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
            result.current.openModal('productDetail', { productId: 1 });
        });

        expect(document.body.style.overflow).toBe('hidden');
    });

    it('closeModal restores body overflow to auto', () => {
        const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;
        const { result } = renderHook(() => useModal(), { wrapper });

        act(() => {
            result.current.openModal('productDetail', { productId: 1 });
        });

        expect(document.body.style.overflow).toBe('hidden');

        act(() => {
            result.current.closeModal();
        });

        expect(document.body.style.overflow).toBe('auto');
    });

    it('openModal can be called with different modal types', () => {
        const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;
        const { result } = renderHook(() => useModal(), { wrapper });

        // These should not throw
        act(() => { result.current.openModal('productDetail', {}); });
        act(() => { result.current.closeModal(); });

        act(() => { result.current.openModal('dealDetail', {}); });
        act(() => { result.current.closeModal(); });

        act(() => { result.current.openModal('profile', {}); });
        act(() => { result.current.closeModal(); });

        act(() => { result.current.openModal('cart', {}); });
        act(() => { result.current.closeModal(); });

        // No errors means success
        expect(true).toBe(true);
    });
});
