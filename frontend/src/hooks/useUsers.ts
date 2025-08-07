import { useState, useEffect, useCallback } from 'react';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types';
import { usersApi } from '../services/api';
import { useNotification } from '../context';
import { errorUtils } from '../utils';

interface UseUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UseUsersReturn {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
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
  createUser: (userData: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  assignRole: (userId: string, roleId: string, applicationId: string) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;
}

export const useUsers = (options: UseUsersOptions = {}): UseUsersReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = '',
    autoFetch = true,
  } = options;

  const [users, setUsers] = useState<User[]>([]);
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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    console.log('🔄 useUsers - fetchUsers called with:', {
      page: pagination.current,
      limit: pagination.pageSize,
      search: search || undefined,
    });
    
    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.getUsers({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
      });

      console.log('📋 useUsers - Got response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('✅ useUsers - Setting users:', response.data.items);
        setUsers(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        }));
        console.log('✅ useUsers - Updated pagination:', {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        });
      } else {
        console.error('❌ useUsers - Response not successful:', response);
        throw new Error(response.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('❌ useUsers - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Users',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, addNotification]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [fetchUsers, autoFetch]);

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
    await fetchUsers();
  }, [fetchUsers]);

  // Create user
  const createUser = useCallback(async (userData: CreateUserRequest): Promise<User> => {
    try {
      const response = await usersApi.createUser(userData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'User Created',
          message: `User ${userData.email} has been created successfully.`,
        });
        
        // Refetch users to update the list
        await fetchUsers();
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create user');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Creating User',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchUsers]);

  // Update user
  const updateUser = useCallback(async (id: string, userData: UpdateUserRequest): Promise<User> => {
    try {
      const response = await usersApi.updateUser(id, userData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'User Updated',
          message: 'User has been updated successfully.',
        });
        
        // Update user in local state
        setUsers(prev => prev.map(user => 
          user.id === id ? response.data! : user
        ));
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update user');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Updating User',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Delete user
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await usersApi.deleteUser(id);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'User Deleted',
          message: 'User has been deleted successfully.',
        });
        
        // Remove user from local state
        setUsers(prev => prev.filter(user => user.id !== id));
        
        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        throw new Error(response.error || 'Failed to delete user');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Deleting User',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Assign role
  const assignRole = useCallback(async (
    userId: string,
    roleId: string,
    applicationId: string
  ): Promise<void> => {
    try {
      const response = await usersApi.assignRole(userId, { role_id: roleId, application_id: applicationId });
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Role Assigned',
          message: 'Role has been assigned successfully.',
        });
        
        // Refetch users to update roles
        await fetchUsers();
      } else {
        throw new Error(response.error || 'Failed to assign role');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Assigning Role',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchUsers]);

  // Remove role
  const removeRole = useCallback(async (userId: string, roleId: string): Promise<void> => {
    try {
      const response = await usersApi.removeRole(userId, roleId);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Role Removed',
          message: 'Role has been removed successfully.',
        });
        
        // Refetch users to update roles
        await fetchUsers();
      } else {
        throw new Error(response.error || 'Failed to remove role');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Removing Role',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchUsers]);

  return {
    users,
    setUsers,
    loading,
    error,
    pagination,
    search,
    setSearch,
    setPage,
    setPageSize,
    refetch,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
  };
};

export default useUsers;