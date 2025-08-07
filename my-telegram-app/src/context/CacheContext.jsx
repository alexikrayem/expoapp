// src/context/CacheContext.jsx - Caching system to prevent unnecessary loading
import React, { createContext, useContext, useState, useCallback } from 'react';

const CacheContext = createContext();

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};

export const CacheProvider = ({ children }) => {
    const [cache, setCache] = useState(new Map());
    const [loadingStates, setLoadingStates] = useState(new Map());

    const getCachedData = useCallback((key) => {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        return null;
    }, [cache]);

    const setCachedData = useCallback((key, data, ttl = 5 * 60 * 1000) => { // 5 minutes default TTL
        setCache(prev => new Map(prev.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        })));
    }, []);

    const invalidateCache = useCallback((keyPattern) => {
        setCache(prev => {
            const newCache = new Map(prev);
            for (const key of newCache.keys()) {
                if (key.includes(keyPattern)) {
                    newCache.delete(key);
                }
            }
            return newCache;
        });
    }, []);

    const clearCache = useCallback(() => {
        setCache(new Map());
    }, []);

    const setLoading = useCallback((key, isLoading) => {
        setLoadingStates(prev => new Map(prev.set(key, isLoading)));
    }, []);

    const isLoading = useCallback((key) => {
        return loadingStates.get(key) || false;
    }, [loadingStates]);

    const cachedApiCall = useCallback(async (key, apiCall, ttl = 5 * 60 * 1000) => {
        // Check if we already have cached data
        const cachedData = getCachedData(key);
        if (cachedData) {
            return cachedData;
        }

        // Check if we're already loading this data
        if (isLoading(key)) {
            // Return a promise that resolves when loading is complete
            return new Promise((resolve) => {
                const checkLoading = () => {
                    if (!isLoading(key)) {
                        const data = getCachedData(key);
                        resolve(data);
                    } else {
                        setTimeout(checkLoading, 100);
                    }
                };
                checkLoading();
            });
        }

        try {
            setLoading(key, true);
            const data = await apiCall();
            setCachedData(key, data, ttl);
            return data;
        } finally {
            setLoading(key, false);
        }
    }, [getCachedData, setCachedData, isLoading, setLoading]);

    const value = {
        getCachedData,
        setCachedData,
        invalidateCache,
        clearCache,
        isLoading,
        cachedApiCall
    };

    return (
        <CacheContext.Provider value={value}>
            {children}
        </CacheContext.Provider>
    );
};