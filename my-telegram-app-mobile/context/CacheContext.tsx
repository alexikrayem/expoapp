/**
 * @deprecated CacheContext duplicates React Query's built-in caching (staleTime, gcTime, dedup).
 * All consumers have been migrated to useQuery. This provider is retained temporarily for
 * backward compatibility and should be removed in a follow-up cleanup.
 * See: Finding 4 in Architecture & Navigation Review.
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry {
    data: unknown;
    expiry: number;
}

interface CacheContextType {
    cachedApiCall: (key: string, apiCallFn: () => Promise<unknown>, ttl?: number) => Promise<unknown>;
    invalidateCache: (prefix: string) => void;
    clearCache: () => void;
    isLoading: (key: string) => boolean;
}

const CacheContext = createContext<CacheContextType | null>(null);

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};

export const CacheProvider = ({ children }: { children: React.ReactNode }) => {
    const [cacheState, setCacheState] = useState(new Map<string, CacheEntry>());
    const [loadingState, setLoadingState] = useState(new Map<string, boolean>());

    const cacheRef = useRef(cacheState);
    const loadingRef = useRef(loadingState);
    const activeRequests = useRef(new Map<string, Promise<unknown>>());

    useEffect(() => {
        cacheRef.current = cacheState;
    }, [cacheState]);

    useEffect(() => {
        loadingRef.current = loadingState;
    }, [loadingState]);

    const getCachedData = useCallback((key: string) => {
        const cached = cacheRef.current.get(key);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        return null;
    }, []);

    const setCachedData = useCallback((key: string, data: unknown, ttl = 5 * 60 * 1000) => {
        setCacheState((prev: Map<string, CacheEntry>) => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                expiry: Date.now() + ttl
            });
            return newCache;
        });
    }, []);

    const invalidateCache = useCallback((prefix: string) => {
        setCacheState((prev: Map<string, CacheEntry>) => {
            const newCache = new Map(prev);
            for (const key of Array.from(newCache.keys())) {
                if (key.startsWith(prefix)) {
                    newCache.delete(key);
                }
            }
            return newCache;
        });
    }, []);

    const clearCache = useCallback(() => {
        setCacheState(new Map());
        setLoadingState(new Map());
        activeRequests.current.clear();
    }, []);

    const setLoading = useCallback((key: string, isLoadingStatus: boolean) => {
        setLoadingState((prev: Map<string, boolean>) => {
            const newLoading = new Map(prev);
            if (isLoadingStatus) {
                newLoading.set(key, true);
            } else {
                newLoading.delete(key);
            }
            return newLoading;
        });
    }, []);

    const publicIsLoading = useCallback((key: string) => {
        return loadingRef.current.has(key);
    }, []);

    const cachedApiCall = useCallback(async (key: string, apiCallFn: () => Promise<unknown>, ttl = 5 * 60 * 1000) => {
        const cachedData = getCachedData(key);
        if (cachedData !== null) {
            return cachedData;
        }

        if (activeRequests.current.has(key)) {
            return activeRequests.current.get(key);
        }

        setLoading(key, true);

        const requestPromise = apiCallFn()
            .then(data => {
                setCachedData(key, data, ttl);
                return data;
            })
            .catch(error => {
                throw error;
            })
            .finally(() => {
                setLoading(key, false);
                activeRequests.current.delete(key);
            });

        activeRequests.current.set(key, requestPromise);
        return requestPromise;

    }, [getCachedData, setCachedData, setLoading]);

    const value = React.useMemo(() => ({
        cachedApiCall,
        invalidateCache,
        clearCache,
        isLoading: publicIsLoading
    }), [cachedApiCall, invalidateCache, clearCache, publicIsLoading]);

    return (
        <CacheContext.Provider value={value}>
            {children}
        </CacheContext.Provider>
    );
};
