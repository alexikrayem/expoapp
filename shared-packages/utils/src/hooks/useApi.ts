import { useState, useEffect, useCallback } from 'react'
import { ApiError } from '@medical-expo/api-client'

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

export interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => Promise<void> } {
  const { immediate = true, onSuccess, onError } = options
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await apiCall()
      setState({ data, loading: false, error: null })
      onSuccess?.(data)
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Unknown error', 500)
      setState(prev => ({ ...prev, loading: false, error: apiError }))
      onError?.(apiError)
    }
  }, [apiCall, onSuccess, onError])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return {
    ...state,
    refetch: execute,
  }
}

export function useMutation<T, P = any>(
  mutationFn: (params: P) => Promise<T>,
  options: UseApiOptions = {}
): {
  mutate: (params: P) => Promise<void>
  loading: boolean
  error: ApiError | null
  data: T | null
} {
  const { onSuccess, onError } = options
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(async (params: P) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await mutationFn(params)
      setState({ data, loading: false, error: null })
      onSuccess?.(data)
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Unknown error', 500)
      setState(prev => ({ ...prev, loading: false, error: apiError }))
      onError?.(apiError)
      throw apiError
    }
  }, [mutationFn, onSuccess, onError])

  return {
    mutate,
    ...state,
  }
}