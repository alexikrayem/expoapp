// src/hooks/useApi.js - Extracted from MainPanel for reusability
import { useState, useEffect, useCallback } from 'react';

export function useApi(apiCall, options = {}) {
    const { immediate = true, onSuccess, onError } = options;
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await apiCall();
            setData(result);
            onSuccess?.(result);
        } catch (err) {
            setError(err.message || 'An error occurred');
            onError?.(err);
        } finally {
            setLoading(false);
        }
    }, [apiCall, onSuccess, onError]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return {
        data,
        loading,
        error,
        refetch: execute,
    };
}

export function useMutation(mutationFn, options = {}) {
    const { onSuccess, onError } = options;
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const mutate = useCallback(async (variables) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await mutationFn(variables);
            setData(result);
            onSuccess?.(result);
            return result;
        } catch (err) {
            setError(err.message || 'An error occurred');
            onError?.(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [mutationFn, onSuccess, onError]);

    return {
        mutate,
        loading,
        error,
        data,
    };
}