import { useState, useEffect, useCallback } from 'react';
import type { Permission } from '../types';
import { permissionsApi } from '../services/api';
import { errorUtils } from '../utils';

interface UseAllPermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch ALL permissions without pagination
 * Specifically designed for permission selectors that need the complete list
 */
export const useAllPermissions = (): UseAllPermissionsReturn => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all permissions without pagination
  const fetchAllPermissions = useCallback(async () => {
    console.log('🔄 useAllPermissions - fetchAllPermissions called');
    
    setLoading(true);
    setError(null);

    try {
      // Use a very high limit to get all permissions at once
      const response = await permissionsApi.getPermissions({
        page: 1,
        limit: 10000, // Very high limit to ensure we get all permissions
      });

      console.log('📋 useAllPermissions - Got response:', {
        success: response.success,
        totalPermissions: response.data?.items.length || 0,
        totalInDB: response.data?.total || 0
      });

      if (response.success && response.data) {
        console.log('✅ useAllPermissions - Setting permissions:', response.data.items.length);
        setPermissions(response.data.items);
        
        // Log if we didn't get all permissions
        if (response.data.items.length < response.data.total) {
          console.warn('⚠️ useAllPermissions - Did not fetch all permissions:', {
            fetched: response.data.items.length,
            total: response.data.total
          });
        }
      } else {
        console.error('❌ useAllPermissions - Response not successful:', response);
        throw new Error(response.error || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('❌ useAllPermissions - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchAllPermissions();
  }, [fetchAllPermissions]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchAllPermissions();
  }, [fetchAllPermissions]);

  return {
    permissions,
    loading,
    error,
    refetch,
  };
};

export default useAllPermissions;