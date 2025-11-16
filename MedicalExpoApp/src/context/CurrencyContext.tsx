import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// --- Configuration ---
const LOCAL_CURRENCY_CODE = 'SYP';
const LOCAL_CURRENCY_SYMBOL = 'ل.س';
const FALLBACK_CONVERSION_RATE = 14000; // A recent, reasonable market rate for SYP

interface CurrencyContextType {
  conversionRate: number | null;
  isLoading: boolean;
  error: string | null;
  formatPrice: (usdPrice: number) => string;
  localCurrencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSypConversionRate = async () => {
      const apiUrl = 'https://sp-today.com/api/v1/latest/USD';

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch SYP exchange rates.');

        const data = await response.json();

        if (data.code === 200 && data.data) {
          const sypData = data.data.find((c: any) => c.currency === 'SYP');
          if (sypData && sypData.buy_rate) {
            const rate = parseFloat(sypData.buy_rate);
            setConversionRate(rate);
          } else {
            throw new Error('SYP currency data not found in API response.');
          }
        } else {
          throw new Error('Invalid API response structure from sp-today.');
        }
      } catch (err: any) {
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

  // Create a reusable formatting function
  const formatPrice = useCallback((usdPrice: number) => {
    if (isLoading || !conversionRate || usdPrice === null || usdPrice === undefined) {
      return '...'; // Show loading state
    }

    const localPrice = parseFloat(usdPrice.toString()) * conversionRate!;
    const formattedPrice = Math.round(localPrice).toLocaleString('en-US');

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