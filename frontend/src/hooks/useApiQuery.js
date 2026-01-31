import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Custom hook for API queries with loading and error states
 * @param {string} queryKey - Unique key for this query
 * @param {Function} queryFn - Async function that returns data
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export const useApiQuery = (queryKey, queryFn, options = {}) => {
  const {
    enabled = true,
    onSuccess,
    onError,
    showErrorToast = true,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err);
      
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: err.message || 'An error occurred while fetching data',
          variant: 'destructive',
        });
      }
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled, onSuccess, onError, showErrorToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Custom hook for API mutations with loading and error states
 * @param {Function} mutationFn - Async function that performs the mutation
 * @param {Object} options - Configuration options
 * @returns {Object} - { mutate, isLoading, error, data }
 */
export const useApiMutation = (mutationFn, options = {}) => {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
  } = options;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(...args);
      setData(result);
      
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: err.message || 'An error occurred',
          variant: 'destructive',
        });
      }
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, onSuccess, onError, showSuccessToast, showErrorToast, successMessage]);

  return {
    mutate,
    isLoading,
    error,
    data,
  };
};

/**
 * Hook for optimistic updates with rollback on error
 * @param {*} initialValue - Initial value
 * @returns {Object} - { value, optimisticUpdate, rollback }
 */
export const useOptimisticUpdate = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [previousValue, setPreviousValue] = useState(initialValue);

  const optimisticUpdate = useCallback((newValue) => {
    setPreviousValue(value);
    setValue(newValue);
  }, [value]);

  const rollback = useCallback(() => {
    setValue(previousValue);
  }, [previousValue]);

  const commit = useCallback(() => {
    setPreviousValue(value);
  }, [value]);

  return {
    value,
    optimisticUpdate,
    rollback,
    commit,
  };
};
