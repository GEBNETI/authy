import { useState, useEffect, useCallback } from 'react';
import type { Application, CreateApplicationRequest, UpdateApplicationRequest } from '../types';
import { applicationsApi } from '../services/api';
import { useNotification } from '../context';
import { errorUtils } from '../utils';

interface UseApplicationsOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

interface UseApplicationsReturn {
  applications: Application[];
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
  createApplication: (applicationData: CreateApplicationRequest) => Promise<Application>;
  updateApplication: (id: string, applicationData: UpdateApplicationRequest) => Promise<Application>;
  deleteApplication: (id: string) => Promise<void>;
  regenerateAPIKey: (id: string) => Promise<string>;
}

export const useApplications = (options: UseApplicationsOptions = {}): UseApplicationsReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = '',
    autoFetch = true,
  } = options;

  const [applications, setApplications] = useState<Application[]>([]);
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

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    console.log('🔄 useApplications - fetchApplications called with:', {
      page: pagination.current,
      limit: pagination.pageSize,
      search: search || undefined,
    });
    
    setLoading(true);
    setError(null);

    try {
      const response = await applicationsApi.getApplications({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
      });

      console.log('📋 useApplications - Got response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('✅ useApplications - Setting applications:', response.data.items);
        setApplications(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        }));
        console.log('✅ useApplications - Updated pagination:', {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: response.data!.total,
          totalPages: response.data!.totalPages,
        });
      } else {
        console.error('❌ useApplications - Response not successful:', response);
        throw new Error(response.error || 'Failed to fetch applications');
      }
    } catch (err) {
      console.error('❌ useApplications - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Applications',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, addNotification]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchApplications();
    }
  }, [fetchApplications, autoFetch]);

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
    await fetchApplications();
  }, [fetchApplications]);

  // Create application
  const createApplication = useCallback(async (applicationData: CreateApplicationRequest): Promise<Application> => {
    try {
      const response = await applicationsApi.createApplication(applicationData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Application Created',
          message: `Application ${applicationData.name} has been created successfully.`,
        });
        
        // Refetch applications to update the list
        await fetchApplications();
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create application');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Creating Application',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification, fetchApplications]);

  // Update application
  const updateApplication = useCallback(async (id: string, applicationData: UpdateApplicationRequest): Promise<Application> => {
    try {
      const response = await applicationsApi.updateApplication(id, applicationData);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Application Updated',
          message: 'Application has been updated successfully.',
        });
        
        // Update application in local state
        setApplications(prev => prev.map(app => 
          app.id === id ? response.data! : app
        ));
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update application');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Updating Application',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Delete application
  const deleteApplication = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await applicationsApi.deleteApplication(id);
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Application Deleted',
          message: 'Application has been deleted successfully.',
        });
        
        // Remove application from local state
        setApplications(prev => prev.filter(app => app.id !== id));
        
        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        throw new Error(response.error || 'Failed to delete application');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Deleting Application',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  // Regenerate API key
  const regenerateAPIKey = useCallback(async (id: string): Promise<string> => {
    try {
      const response = await applicationsApi.regenerateAPIKey(id);
      
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'API Key Regenerated',
          message: 'New API key has been generated successfully.',
        });
        
        return response.data.api_key;
      } else {
        throw new Error(response.error || 'Failed to regenerate API key');
      }
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Regenerating API Key',
        message: errorMessage,
      });
      throw err;
    }
  }, [addNotification]);

  return {
    applications,
    loading,
    error,
    pagination,
    search,
    setSearch,
    setPage,
    setPageSize,
    refetch,
    createApplication,
    updateApplication,
    deleteApplication,
    regenerateAPIKey,
  };
};

export default useApplications;