import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const CacheContext = createContext();

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};

export const CacheProvider = ({ children }) => {
    // We use `useState` to trigger re-renders when the cache/loading state changes for components consuming them.
    // We use `useRef` to hold the *latest* Map instances for stable useCallback functions to read from.
    const [cacheState, setCacheState] = useState(new Map());
    const [loadingState, setLoadingState] = useState(new Map());

    // Refs to store the mutable Map instances without triggering re-renders when they change
    const cacheRef = useRef(cacheState);
    const loadingRef = useRef(loadingState);
    const activeRequests = useRef(new Map()); // To dedupe concurrent API calls for the same key

    // Keep the refs updated with the latest state
    useEffect(() => {
        cacheRef.current = cacheState;
    }, [cacheState]);

    useEffect(() => {
        loadingRef.current = loadingState;
    }, [loadingState]);

    // --- Stable utility functions ---

    // getCachedData can now have an empty dependency array because it reads from cacheRef.current
    const getCachedData = useCallback((key) => {
        const cached = cacheRef.current.get(key); // Read from ref
        // Check for 'expiry' instead of 'timestamp' + 'ttl' as done in previous fixed useProducts
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
        return null;
    }, []); // Stable: Empty dependency array

    // setCachedData already uses functional update, so it can be stable
    const setCachedData = useCallback((key, data, ttl = 5 * 60 * 1000) => { // 5 minutes default TTL
        setCacheState(prev => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                // Store expiry time directly for easier comparison
                expiry: Date.now() + ttl 
            });
            return newCache;
        });
    }, []); // Stable: Empty dependency array

    // invalidateCache already uses functional update, so it can be stable
    const invalidateCache = useCallback((prefix) => {
        setCacheState(prev => {
            const newCache = new Map(prev);
            // Use Array.from to safely iterate over Map keys while deleting
            for (const key of Array.from(newCache.keys())) {
                // Changed from .includes to .startsWith for more precise invalidation
                // (e.g., "products_123" will invalidate "products_123_cat_all" but not "otherproducts_123")
                if (key.startsWith(prefix)) { 
                    newCache.delete(key);
                }
            }
            return newCache;
        });
    }, []); // Stable: Empty dependency array

    const clearCache = useCallback(() => {
        setCacheState(new Map());
        setLoadingState(new Map()); // Also clear loading states
        activeRequests.current.clear(); // Clear any ongoing requests
    }, []); // Stable: Empty dependency array

    // setLoading can now have an empty dependency array because it uses functional update
    const setLoading = useCallback((key, isLoadingStatus) => {
        setLoadingState(prev => {
            const newLoading = new Map(prev);
            if (isLoadingStatus) {
                newLoading.set(key, true);
            } else {
                newLoading.delete(key); // Remove the key when loading is complete
            }
            return newLoading;
        });
    }, []); // Stable: Empty dependency array

    // Public isLoading function, reads from loadingRef.current
    const publicIsLoading = useCallback((key) => {
        return loadingRef.current.has(key); // Check directly if key exists in the loading map
    }, []); // Stable: Empty dependency array

    // cachedApiCall is the main complex function. It must depend only on stable functions.
    const cachedApiCall = useCallback(async (key, apiCallFn, ttl = 5 * 60 * 1000) => {
        // 1. Check cache first
        const cachedData = getCachedData(key);
        if (cachedData !== null) { // Check for null specifically, as cachedData might be a falsy but valid value (e.g., 0, empty string)
            return cachedData;
        }

        // 2. Deduping concurrent requests: If an identical request is already in progress, return its promise
        if (activeRequests.current.has(key)) {
            return activeRequests.current.get(key);
        }

        // 3. Indicate loading and execute the API call
        setLoading(key, true); // Mark as loading

        const requestPromise = apiCallFn()
            .then(data => {
                setCachedData(key, data, ttl); // Cache the data on success
                return data;
            })
            .catch(error => {
                // If API call fails, we still clear loading but might not cache the error
                // You might want to cache errors for a short duration too, depending on requirements
                throw error; // Re-throw the error so callers can catch it
            })
            .finally(() => {
                setLoading(key, false); // Clear loading state
                activeRequests.current.delete(key); // Remove from active requests map
            });

        activeRequests.current.set(key, requestPromise); // Store the promise for deduping
        return requestPromise;

    }, [getCachedData, setCachedData, setLoading]); // All dependencies are now stable useCallback functions!

    const value = {
        cachedApiCall,
        invalidateCache,
        clearCache,
        isLoading: publicIsLoading // Expose the stable public isLoading
    };

    return (
        <CacheContext.Provider value={value}>
            {children}
        </CacheContext.Provider>
    );
};