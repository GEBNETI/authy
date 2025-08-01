import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  User,
  Activity,
  Building,
  Shield,
  BarChart3,
  Clock
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Table, 
  Badge, 
  Modal, 
  ModalBody, 
  ModalFooter,
  Select
} from '../../components/ui';
import { useAuditLogs } from '../../hooks';
import type { AuditLog } from '../../types';
import { utils, formatUtils } from '../../utils';

const AuditLogsPage: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    auditLogs,
    loading,
    pagination,
    filters,
    stats,
    options,
    setPage,
    setFilters,
    exportLogs,
    loadStats,
    refetch,
  } = useAuditLogs({
    autoFetch: true,
    limit: 20,
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () => utils.debounce((value: string) => {
      setFilters({ search: value || undefined });
    }, 500),
    [setFilters]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value || undefined });
  };

  // Handle export
  const handleExport = async () => {
    await exportLogs();
  };

  // Handle view details
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'success';
    if (action.includes('update')) return 'info';
    if (action.includes('delete')) return 'error';
    if (action.includes('login')) return 'primary';
    if (action.includes('failed')) return 'error';
    return 'neutral';
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('login')) return User;
    if (action.includes('role')) return Shield;
    if (action.includes('application')) return Building;
    return Activity;
  };

  // Format IP address
  const formatIPAddress = (ip?: string) => {
    if (!ip) return 'N/A';
    return ip;
  };

  // Table columns
  const columns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      width: '160px',
      render: (value: string) => (
        <div className="text-sm">
          <div className="font-medium text-base-content">
            {formatUtils.formatDate(value)}
          </div>
          <div className="text-base-content/70">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value: string, _record: AuditLog) => {
        const Icon = getActionIcon(value);
        return (
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-base-content/70" />
            <Badge
              variant={getActionBadgeVariant(value)}
              size="sm"
            >
              {value.replace('_', ' ')}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'resource',
      label: 'Resource',
      sortable: true,
      render: (value: string, record: AuditLog) => (
        <div className="text-sm">
          <div className="font-medium text-base-content">{value}</div>
          {record.resource_id && (
            <div className="text-base-content/70 truncate max-w-32">
              ID: {record.resource_id}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (_value: any, record: AuditLog) => (
        <div className="text-sm">
          {record.user ? (
            <>
              <div className="font-medium text-base-content">
                {record.user.first_name} {record.user.last_name}
              </div>
              <div className="text-base-content/70">{record.user.email}</div>
            </>
          ) : (
            <span className="text-base-content/40">System</span>
          )}
        </div>
      ),
    },
    {
      key: 'application',
      label: 'Application',
      render: (_value: any, record: AuditLog) => (
        <div className="text-sm">
          {record.application ? (
            <div className="flex items-center space-x-1">
              <Building className="w-3 h-3 text-base-content/70" />
              <span className="font-medium text-base-content">
                {record.application.name}
              </span>
            </div>
          ) : (
            <span className="text-base-content/40">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      render: (value: string) => (
        <div className="text-sm font-mono text-base-content">
          {formatIPAddress(value)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '80px',
      render: (_: any, record: AuditLog) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(record)}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Audit Logs</h1>
          <p className="text-base-content/70 mt-1">
            Monitor all system activities and security events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              loadStats();
              setShowFilters(!showFilters);
            }}
            icon={BarChart3}
          >
            Statistics
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            icon={Download}
          >
            Export
          </Button>
          <Button
            variant="ghost"
            onClick={refetch}
            icon={Clock}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Total Logs</div>
            <div className="stat-value text-primary">{stats.total_logs.toLocaleString()}</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Unique Users</div>
            <div className="stat-value text-info">{stats.unique_users}</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Applications</div>
            <div className="stat-value text-success">{stats.unique_applications}</div>
          </div>
          <div className="stat bg-base-100 rounded-lg shadow">
            <div className="stat-title">Top Action</div>
            <div className="stat-value text-warning text-lg">
              {stats.top_actions[0]?.action || 'N/A'}
            </div>
            <div className="stat-desc">
              {stats.top_actions[0]?.count || 0} occurrences
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search logs..."
            icon={Search}
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          icon={Filter}
        >
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-base-100 rounded-lg p-4 border border-base-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Action</span>
              </label>
              <Select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                options={[
                  { value: '', label: 'All Actions' },
                  ...(options?.actions.map(action => ({
                    value: action,
                    label: action.replace('_', ' '),
                  })) || [])
                ]}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Resource</span>
              </label>
              <Select
                value={filters.resource || ''}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                options={[
                  { value: '', label: 'All Resources' },
                  ...(options?.resources.map(resource => ({
                    value: resource,
                    label: resource,
                  })) || [])
                ]}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Application</span>
              </label>
              <Select
                value={filters.application_id || ''}
                onChange={(e) => handleFilterChange('application_id', e.target.value)}
                options={[
                  { value: '', label: 'All Applications' },
                  ...(options?.applications.map(app => ({
                    value: app.id,
                    label: app.name,
                  })) || [])
                ]}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Date Range</span>
              </label>
              <div className="flex space-x-1">
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({
                  action: undefined,
                  resource: undefined,
                  application_id: undefined,
                  start_date: undefined,
                  end_date: undefined,
                });
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        data={auditLogs}
        columns={columns}
        loading={loading}
        emptyMessage="No audit logs found"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: setPage,
        }}
        className="w-full"
      />

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Audit Log Details"
        size="lg"
      >
        <ModalBody>
          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Timestamp</label>
                  <p className="mt-1 text-sm text-base-content">
                    {formatUtils.formatDateTime(selectedLog.created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Action</label>
                  <p className="mt-1">
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} size="sm">
                      {selectedLog.action.replace('_', ' ')}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Resource</label>
                  <p className="mt-1 text-sm text-base-content">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Resource ID</label>
                  <p className="mt-1 text-sm text-base-content font-mono">
                    {selectedLog.resource_id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* User Info */}
              {selectedLog.user && (
                <div>
                  <label className="block text-sm font-medium text-base-content/70">User</label>
                  <div className="mt-1 p-3 bg-base-200 rounded-lg">
                    <p className="text-sm font-medium text-base-content">
                      {selectedLog.user.first_name} {selectedLog.user.last_name}
                    </p>
                    <p className="text-sm text-base-content/70">{selectedLog.user.email}</p>
                    <p className="text-sm text-base-content/70">ID: {selectedLog.user.id}</p>
                  </div>
                </div>
              )}

              {/* Application Info */}
              {selectedLog.application && (
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Application</label>
                  <div className="mt-1 p-3 bg-base-200 rounded-lg">
                    <p className="text-sm font-medium text-base-content">
                      {selectedLog.application.name}
                    </p>
                    <p className="text-sm text-base-content/70">{selectedLog.application.description}</p>
                    <p className="text-sm text-base-content/70">ID: {selectedLog.application.id}</p>
                  </div>
                </div>
              )}

              {/* Network Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-base-content/70">IP Address</label>
                  <p className="mt-1 text-sm text-base-content font-mono">
                    {formatIPAddress(selectedLog.ip_address)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-base-content/70">User Agent</label>
                  <p className="mt-1 text-sm text-base-content truncate" title={selectedLog.user_agent}>
                    {selectedLog.user_agent || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Details */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-base-content/70">Additional Details</label>
                  <div className="mt-1 p-3 bg-base-200 rounded-lg">
                    <pre className="text-sm text-base-content whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AuditLogsPage;