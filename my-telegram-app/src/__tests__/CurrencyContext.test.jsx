import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { CurrencyProvider, useCurrency } from '../context/CurrencyContext';

describe('CurrencyContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows loading state initially', () => {
        global.fetch.mockImplementation(() => new Promise(() => { })); // Never resolves

        const wrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;
        const { result } = renderHook(() => useCurrency(), { wrapper });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.formatPrice(100)).toBe('...');
    });

    it('fetches and sets conversion rate from API', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [
                    { currency: 'SYP', buy_rate: '14500' }
                ]
            })
        });

        const wrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;
        const { result } = renderHook(() => useCurrency(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.conversionRate).toBe(14500);
    });

    it('uses fallback rate when API fails', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const wrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;
        const { result } = renderHook(() => useCurrency(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Fallback rate is 14000
        expect(result.current.conversionRate).toBe(14000);
        expect(result.current.error).toBe('Network error');
    });

    it('formatPrice correctly converts USD to SYP', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ currency: 'SYP', buy_rate: '10000' }]
            })
        });

        const wrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;
        const { result } = renderHook(() => useCurrency(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // $1 * 10000 = 10,000 ل.س
        expect(result.current.formatPrice(1)).toBe('10,000 ل.س');
        // $10 * 10000 = 100,000 ل.س
        expect(result.current.formatPrice(10)).toBe('100,000 ل.س');
    });

    it('formatPrice returns loading indicator for null/undefined values', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ currency: 'SYP', buy_rate: '14000' }]
            })
        });

        const wrapper = ({ children }) => <CurrencyProvider>{children}</CurrencyProvider>;
        const { result } = renderHook(() => useCurrency(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.formatPrice(null)).toBe('...');
        expect(result.current.formatPrice(undefined)).toBe('...');
    });
});
