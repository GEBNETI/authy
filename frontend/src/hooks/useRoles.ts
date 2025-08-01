import { useState, useEffect, useCallback } from 'react';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '../types';
import { rolesApi } from '../services/api';
import { useNotification } from '../context';
import { errorUtils } from '../utils';

interface UseRolesOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UseRolesReturn {
  roles: Role[];
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
  createRole: (roleData: CreateRoleRequest) => Promise<Role>;
  updateRole: (id: string, roleData: UpdateRoleRequest) => Promise<Role>;
  deleteRole: (id: string) => Promise<void>;
  assignPermissions: (roleId: string, permissionIds: string[]) => Promise<Role>;
}

export const useRoles = (options: UseRolesOptions = {}): UseRolesReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = '',
    autoFetch = true,
  } = options;

  const [roles, setRoles] = useState<Role[]>([]);
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

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    console.log('🔄 useRoles - fetchRoles called with:', {
      page: pagination.current,
      limit: pagination.pageSize,
      search: search || undefined,
    });
    
    setLoading(true);
    setError(null);

    try {
      const response = await rolesApi.getRoles({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
      });

      console.log('📋 useRoles - Got response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('✅ useRoles - Setting roles:', response.data.items);
        setRoles(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        }));
        console.log('✅ useRoles - Updated pagination:', {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        });
      } else {
        console.error('❌ useRoles - Response not successful:', response);
        throw new Error(response.error || 'Failed to fetch roles');
      }
    } catch (err) {
      console.error('❌ useRoles - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Roles',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, addNotification]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchRoles();
    }
  }, [fetchRoles, autoFetch]);

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
    await fetchRoles();
  }, [fetchRoles]);

  // Create role
  const createRole = useCallback(async (roleData: CreateRoleRequest): Promise<Role> => {
    try {
      const response = await rolesApi.createRole(roleData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Role Created',
          message: `Role ${roleData.name} has been created successfully.`,
        });
        
        // Refetch roles to update the list
        await fetchRoles();
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create role');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Creating Role',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchRoles]);

  // Update role
  const updateRole = useCallback(async (id: string, roleData: UpdateRoleRequest): Promise<Role> => {
    try {
      const response = await rolesApi.updateRole(id, roleData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Role Updated',
          message: 'Role has been updated successfully.',
        });
        
        // Update role in local state
        setRoles(prev => prev.map(role => 
          role.id === id ? response.data! : role
        ));
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update role');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Updating Role',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Delete role
  const deleteRole = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await rolesApi.deleteRole(id);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Role Deleted',
          message: 'Role has been deleted successfully.',
        });
        
        // Remove role from local state
        setRoles(prev => prev.filter(role => role.id !== id));
        
        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        throw new Error(response.error || 'Failed to delete role');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Deleting Role',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Assign permissions to role
  const assignPermissions = useCallback(async (roleId: string, permissionIds: string[]): Promise<Role> => {
    try {
      const response = await rolesApi.assignPermissions(roleId, permissionIds);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Permissions Updated',
          message: 'Role permissions have been updated successfully.',
        });
        
        // Update role in local state
        setRoles(prev => prev.map(role => 
          role.id === roleId ? response.data! : role
        ));
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to assign permissions');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Updating Permissions',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  return {
    roles,
    loading,
    error,
    pagination,
    search,
    setSearch,
    setPage,
    setPageSize,
    refetch,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
  };
};

export default useRoles;