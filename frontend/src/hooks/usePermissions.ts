import { useState, useEffect, useCallback } from 'react';
import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '../types';
import { permissionsApi } from '../services/api';
import { useNotification } from '../context';
import { errorUtils } from '../utils';

interface UsePermissionsOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  search: string;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refetch: () => Promise<void>;
  createPermission: (permissionData: CreatePermissionRequest) => Promise<Permission>;
  updatePermission: (id: string, permissionData: UpdatePermissionRequest) => Promise<Permission>;
  deletePermission: (id: string) => Promise<void>;
}

export const usePermissions = (options: UsePermissionsOptions = {}): UsePermissionsReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = '',
    autoFetch = true,
  } = options;

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState(initialSearch);

  const { addNotification } = useNotification();

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    console.log('🔄 usePermissions - fetchPermissions called with:', {
      page: pagination.current,
      limit: pagination.pageSize,
      search: search || undefined,
    });
    
    setLoading(true);
    setError(null);

    try {
      const response = await permissionsApi.getPermissions({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
      });

      console.log('📋 usePermissions - Got response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('✅ usePermissions - Setting permissions:', response.data.items);
        setPermissions(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        }));
        console.log('✅ usePermissions - Updated pagination:', {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        });
      } else {
        console.error('❌ usePermissions - Response not successful:', response);
        throw new Error(response.error || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('❌ usePermissions - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Permissions',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, addNotification]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchPermissions();
    }
  }, [fetchPermissions, autoFetch]);

  // Set page
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, current: page }));
  }, []);

  // Set page size
  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, current: 1 }));
  }, []);

  // Refetch
  const refetch = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  // Create permission
  const createPermission = useCallback(async (permissionData: CreatePermissionRequest): Promise<Permission> => {
    try {
      const response = await permissionsApi.createPermission(permissionData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Permission Created',
          message: `Permission ${permissionData.resource}:${permissionData.action} has been created successfully.`,
        });
        
        // Refetch permissions to update the list
        await fetchPermissions();
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create permission');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Creating Permission',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchPermissions]);

  // Update permission
  const updatePermission = useCallback(async (id: string, permissionData: UpdatePermissionRequest): Promise<Permission> => {
    try {
      const response = await permissionsApi.updatePermission(id, permissionData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Permission Updated',
          message: 'Permission has been updated successfully.',
        });
        
        // Update permission in local state
        setPermissions(prev => prev.map(permission => 
          permission.id === id ? response.data! : permission
        ));
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update permission');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Updating Permission',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Delete permission
  const deletePermission = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await permissionsApi.deletePermission(id);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Permission Deleted',
          message: 'Permission has been deleted successfully.',
        });
        
        // Remove permission from local state
        setPermissions(prev => prev.filter(permission => permission.id !== id));
        
        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        throw new Error(response.error || 'Failed to delete permission');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Deleting Permission',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  return {
    permissions,
    loading,
    error,
    pagination,
    search,
    setSearch,
    setPage,
    setPageSize,
    refetch,
    createPermission,
    updatePermission,
    deletePermission,
  };
};

export default usePermissions;