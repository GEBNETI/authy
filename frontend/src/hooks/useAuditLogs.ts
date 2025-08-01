import { useState, useEffect, useCallback } from 'react';
import type { AuditLog, AuditLogFilters, AuditLogStats, AuditLogOptions } from '../types';
import { auditLogsApi } from '../services/api';
import { errorUtils } from '../utils';
import { useNotification } from '../context';

interface UseAuditLogsOptions {
  page?: number;
  limit?: number;
  autoFetch?: boolean;
  filters?: Omit<AuditLogFilters, 'page' | 'limit'>;
}

interface UseAuditLogsReturn {
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: AuditLogFilters;
  stats: AuditLogStats | null;
  options: AuditLogOptions | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<AuditLogFilters>) => void;
  refetch: () => Promise<void>;
  exportLogs: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadOptions: () => Promise<void>;
}

export const useAuditLogs = (config: UseAuditLogsOptions = {}): UseAuditLogsReturn => {
  const {
    page: initialPage = 1,
    limit: initialLimit = 20,
    autoFetch = true,
    filters: initialFilters = {},
  } = config;

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [options, setOptions] = useState<AuditLogOptions | null>(null);
  const [pagination, setPagination] = useState({
    current: initialPage,
    pageSize: initialLimit,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFiltersState] = useState<AuditLogFilters>({
    page: initialPage,
    limit: initialLimit,
    ...initialFilters,
  });

  const { addNotification } = useNotification();

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (fetchFilters?: AuditLogFilters) => {
    const currentFilters = fetchFilters || filters;
    console.log('📋 useAuditLogs - fetchAuditLogs called with filters:', currentFilters);
    
    setLoading(true);
    setError(null);

    try {
      const response = await auditLogsApi.getAuditLogs(currentFilters);
      console.log('📋 useAuditLogs - fetchAuditLogs response:', response);

      if (response.success && response.data) {
        setAuditLogs(response.data.items);
        setPagination({
          current: response.data.page,
          pageSize: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
        console.log('✅ useAuditLogs - Setting audit logs:', response.data.items.length);
      } else {
        throw new Error(response.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('❌ useAuditLogs - Error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Audit Logs',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, addNotification]);

  // Load statistics
  const loadStats = useCallback(async () => {
    console.log('📊 useAuditLogs - loadStats called');
    
    try {
      const response = await auditLogsApi.getAuditLogStats();
      console.log('📊 useAuditLogs - loadStats response:', response);

      if (response.success && response.data) {
        setStats(response.data);
        console.log('✅ useAuditLogs - Setting stats:', response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch audit log stats');
      }
    } catch (err) {
      console.error('❌ useAuditLogs - Stats error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: errorMessage,
      });
    }
  }, [addNotification]);

  // Load filter options
  const loadOptions = useCallback(async () => {
    console.log('⚙️ useAuditLogs - loadOptions called');
    
    try {
      const response = await auditLogsApi.getAuditLogOptions();
      console.log('⚙️ useAuditLogs - loadOptions response:', response);

      if (response.success && response.data) {
        setOptions(response.data);
        console.log('✅ useAuditLogs - Setting options:', response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch audit log options');
      }
    } catch (err) {
      console.error('❌ useAuditLogs - Options error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Error Loading Filter Options',
        message: errorMessage,
      });
    }
  }, [addNotification]);

  // Export audit logs
  const exportLogs = useCallback(async () => {
    console.log('💾 useAuditLogs - exportLogs called with filters:', filters);
    
    try {
      addNotification({
        type: 'info',
        title: 'Exporting Audit Logs',
        message: 'Preparing your audit logs export...',
      });

      const blob = await auditLogsApi.exportAuditLogs(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: 'Audit logs have been exported successfully.',
      });
    } catch (err) {
      console.error('❌ useAuditLogs - Export error:', err);
      const errorMessage = errorUtils.getErrorMessage(err);
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: errorMessage,
      });
    }
  }, [filters, addNotification]);

  // Set page
  const setPage = useCallback((page: number) => {
    console.log('📄 useAuditLogs - setPage called:', page);
    const newFilters = { ...filters, page };
    setFiltersState(newFilters);
    fetchAuditLogs(newFilters);
  }, [filters, fetchAuditLogs]);

  // Set page size
  const setPageSize = useCallback((limit: number) => {
    console.log('📏 useAuditLogs - setPageSize called:', limit);
    const newFilters = { ...filters, limit, page: 1 };
    setFiltersState(newFilters);
    fetchAuditLogs(newFilters);
  }, [filters, fetchAuditLogs]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<AuditLogFilters>) => {
    console.log('🔍 useAuditLogs - setFilters called:', newFilters);
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFiltersState(updatedFilters);
    fetchAuditLogs(updatedFilters);
  }, [filters, fetchAuditLogs]);

  // Refetch
  const refetch = useCallback(async () => {
    await fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAuditLogs();
      loadOptions();
    }
  }, []);

  return {
    auditLogs,
    loading,
    error,
    pagination,
    filters,
    stats,
    options,
    setPage,
    setPageSize,
    setFilters,
    refetch,
    exportLogs,
    loadStats,
    loadOptions,
  };
};

export default useAuditLogs;