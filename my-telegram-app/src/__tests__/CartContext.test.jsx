import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';

// Mock dependencies
vi.mock('../context/MiniCartContext', () => ({
    useMiniCart: () => ({
        showMiniCartBar: vi.fn(),
    }),
}));

vi.mock('../context/ToastContext', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

// Test component to consume the context
const TestComponent = () => {
    const { cartItems, actions, getCartTotal, getCartItemCount } = useCart();
    return (
        <div>
            <div data-testid="cart-count">{getCartItemCount()}</div>
            <div data-testid="cart-total">{getCartTotal()}</div>
            <button onClick={() => actions.addToCart({
                id: 1,
                name: 'Test Product',
                effective_selling_price: '100',
                supplier_name: 'Test Supplier'
            })}>
                Add Item
            </button>
            <button onClick={() => actions.clearCart()}>Clear Cart</button>
            <ul>
                {cartItems.map(item => (
                    <li key={item.product_id}>{item.name} - {item.quantity}</li>
                ))}
            </ul>
        </div>
    );
};

describe('CartContext', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('provides an initial empty cart', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );
        expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
        expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
    });

    it('adds an item to the cart', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add Item');
        act(() => {
            addButton.click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
        expect(screen.getByTestId('cart-total')).toHaveTextContent('100');
        expect(screen.getByText('Test Product - 1')).toBeDefined();
    });

    it('increases quantity when adding the same item twice', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        const addButton = screen.getByText('Add Item');
        act(() => {
            addButton.click();
            addButton.click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
        expect(screen.getByTestId('cart-total')).toHaveTextContent('200');
        expect(screen.getByText('Test Product - 2')).toBeDefined();
    });

    it('clears the cart', () => {
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        act(() => {
            screen.getByText('Add Item').click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

        act(() => {
            screen.getByText('Clear Cart').click();
        });

        expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });

    it('persists cart to localStorage', () => {
        const { unmount } = render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        act(() => {
            screen.getByText('Add Item').click();
        });

        // Check localStorage
        const saved = JSON.parse(localStorage.getItem('my_app_cart'));
        expect(saved).toHaveLength(1);
        expect(saved[0].name).toBe('Test Product');

        unmount();

        // Re-render and check if it loads
        render(
            <CartProvider>
                <TestComponent />
            </CartProvider>
        );

        expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
        expect(screen.getByText('Test Product - 1')).toBeDefined();
    });
});
