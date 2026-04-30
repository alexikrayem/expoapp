import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

// --- Configuration ---
const LOCAL_CURRENCY_SYMBOL = 'ل.س';
const FALLBACK_CONVERSION_RATE = 14000; // Reasonable recent market rate for SYP
const CURRENCY_CACHE_KEY = 'currency_syp_rate';
const CURRENCY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CURRENCY_FETCH_TIMEOUT_MS = 10_000; // 10 seconds

interface CurrencyContextType {
    conversionRate: number | null;
    isLoading: boolean;
    error: string | null;
    formatPrice: (usdPrice: number | null | undefined) => string;
    localCurrencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within CurrencyProvider');
    }
    return context;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CachedRate {
    rate: number;
    timestamp: number;
}

const getCachedRate = async (): Promise<number | null> => {
    try {
        const raw = await storage.getItem(CURRENCY_CACHE_KEY);
        if (!raw) return null;
        const cached: CachedRate = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CURRENCY_CACHE_TTL_MS) {
            return cached.rate;
        }
    } catch { /* corrupt cache — ignore */ }
    return null;
};

const setCachedRate = async (rate: number): Promise<void> => {
    try {
        const value: CachedRate = { rate, timestamp: Date.now() };
        await storage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(value));
    } catch { /* non-critical — ignore */ }
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
    const [conversionRate, setConversionRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSypConversionRate = async () => {
            // 1. Try local cache first
            const cached = await getCachedRate();
            if (cached) {
                setConversionRate(cached);
                setIsLoading(false);
                return;
            }

            // 2. Fetch from API with timeout
            const apiUrl = process.env['EXPO_PUBLIC_CURRENCY_API_URL'] || 'https://sp-today.com/api/v1/latest/USD';

            try {
                const response = await fetchWithTimeout(apiUrl, CURRENCY_FETCH_TIMEOUT_MS);
                if (!response.ok) throw new Error('Failed to fetch SYP exchange rates.');

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error('Received non-JSON response from currency API.');
                }

                const data = await response.json();

                if (data.code === 200 && data.data) {
                    const sypData = data.data.find((c: { currency: string; buy_rate: string }) => c.currency === 'SYP');
                    if (sypData && sypData.buy_rate) {
                        const rate = parseFloat(sypData.buy_rate);
                        if (!Number.isFinite(rate) || rate <= 0) {
                            throw new Error(`Invalid SYP rate value: ${sypData.buy_rate}`);
                        }
                        setConversionRate(rate);
                        await setCachedRate(rate);
                    } else {
                        throw new Error('SYP currency data not found in API response.');
                    }
                } else {
                    throw new Error('Invalid API response structure from sp-today.');
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown currency fetch error';
                logger.warn("[Currency] Fetch error (using fallback):", message);
                setError(message);
                setConversionRate(FALLBACK_CONVERSION_RATE);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSypConversionRate();
    }, []);

    const formatPrice = useCallback((usdPrice: number | null | undefined) => {
        if (isLoading || !conversionRate || usdPrice === null || usdPrice === undefined) {
            return '...';
        }

        const localPrice = parseFloat(usdPrice.toString()) * conversionRate;
        const formattedPrice = new Intl.NumberFormat('en-US').format(Math.round(localPrice));

        return `${formattedPrice} ${LOCAL_CURRENCY_SYMBOL}`;
    }, [isLoading, conversionRate]);

    const value = useMemo(() => ({
        conversionRate,
        isLoading,
        error,
        formatPrice,
        localCurrencySymbol: LOCAL_CURRENCY_SYMBOL,
    }), [conversionRate, isLoading, error, formatPrice]);

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};
