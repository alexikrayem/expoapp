// src/context/CurrencyContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// --- Configuration ---
const LOCAL_CURRENCY_CODE = 'SYP';
const LOCAL_CURRENCY_SYMBOL = 'ل.س';
const FALLBACK_CONVERSION_RATE = 14000; // A recent, reasonable market rate for SYP

// 1. Create the Context
const CurrencyContext = createContext();

// 2. Create a custom hook for easy access
export const useCurrency = () => {
    return useContext(CurrencyContext);
};

// 3. Create the Provider Component
export const CurrencyProvider = ({ children }) => {
    const [conversionRate, setConversionRate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSypConversionRate = async () => {
            const apiUrl = 'https://sp-today.com/api/v1/latest/USD';

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('Failed to fetch SYP exchange rates.');
                
                const data = await response.json();
                
                if (data.code === 200 && data.data) {
                    const sypData = data.data.find(c => c.currency === 'SYP');
                    if (sypData && sypData.buy_rate) {
                        const rate = parseFloat(sypData.buy_rate);
                        setConversionRate(rate);
                    } else {
                        throw new Error('SYP currency data not found in API response.');
                    }
                } else {
                    throw new Error('Invalid API response structure from sp-today.');
                }
            } catch (err) {
                console.error("SYP currency conversion fetch error:", err);
                setError(err.message);
                setConversionRate(FALLBACK_CONVERSION_RATE);
                console.warn(`[Currency] Using fallback SYP rate:`, FALLBACK_CONVERSION_RATE);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSypConversionRate();
    }, []); // Empty array `[]` means this runs only once

    // 4. Create a reusable formatting function
    const formatPrice = useCallback((usdPrice) => {
        if (isLoading || !conversionRate || usdPrice === null || usdPrice === undefined) {
            return '...'; // Show loading state
        }
        
        const localPrice = parseFloat(usdPrice) * conversionRate;
        const formattedPrice = new Intl.NumberFormat('en-US').format(Math.round(localPrice));

        return `${formattedPrice} ${LOCAL_CURRENCY_SYMBOL}`;
    }, [isLoading, conversionRate]);

    const value = {
        conversionRate,
        isLoading,
        error,
        formatPrice,
        localCurrencySymbol: LOCAL_CURRENCY_SYMBOL,
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};