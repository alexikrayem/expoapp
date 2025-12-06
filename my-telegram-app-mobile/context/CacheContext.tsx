import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const CacheContext = createContext<any>(null);

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};

export const CacheProvider = ({ children }: { children: React.ReactNode }) => {
    const [cacheState, setCacheState] = useState(new Map());
    const [loadingState, setLoadingState] = useState(new Map());

    const cacheRef = useRef(cacheState);
    const loadingRef = useRef(loadingState);
    const activeRequests = useRef(new Map());

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

    const setCachedData = useCallback((key: string, data: any, ttl = 5 * 60 * 1000) => {
        setCacheState((prev: Map<string, any>) => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                expiry: Date.now() + ttl
            });
            return newCache;
        });
    }, []);

    const invalidateCache = useCallback((prefix: string) => {
        setCacheState((prev: Map<string, any>) => {
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

    const cachedApiCall = useCallback(async (key: string, apiCallFn: () => Promise<any>, ttl = 5 * 60 * 1000) => {
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
