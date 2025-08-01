import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  Shield,
  Tag,
  Settings,
  Lock
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Table, 
  Badge, 
  Modal, 
  ModalBody, 
  ModalFooter
} from '../../components/ui';
import { PermissionForm } from '../../components/forms';
import { usePermissions } from '../../hooks';
import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '../../types';
import { utils, formatUtils } from '../../utils';

const PermissionsPage: React.FC = () => {
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const {
    permissions,
    loading,
    pagination,
    setSearch,
    setPage,
    createPermission,
    updatePermission,
    deletePermission,
  } = usePermissions();

  // Debounced search
  const debouncedSearch = useMemo(
    () => utils.debounce((value: string) => setSearch(value), 300),
    [setSearch]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle create permission
  const handleCreatePermission = () => {
    setSelectedPermission(null);
    setShowPermissionForm(true);
  };

  // Handle edit permission
  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowPermissionForm(true);
  };

  // Handle delete permission
  const handleDeletePermission = (permission: Permission) => {
    setPermissionToDelete(permission);
    setShowDeleteModal(true);
  };

  // Handle form submit
  const handleFormSubmit = async (data: CreatePermissionRequest | UpdatePermissionRequest) => {
    setFormLoading(true);
    try {
      if (selectedPermission) {
        await updatePermission(selectedPermission.id, data as UpdatePermissionRequest);
      } else {
        await createPermission(data as CreatePermissionRequest);
      }
      setShowPermissionForm(false);
      setSelectedPermission(null);
    } catch (error) {
      // Error handled by usePermissions hook
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!permissionToDelete) return;

    try {
      await deletePermission(permissionToDelete.id);
      setShowDeleteModal(false);
      setPermissionToDelete(null);
    } catch (error) {
      // Error handled by usePermissions hook
    }
  };

  // Get permission category color
  const getPermissionBadgeVariant = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'users':
        return 'primary';
      case 'applications':
        return 'secondary';
      case 'permissions':
        return 'info';
      case 'roles':
        return 'info';
      case 'audit':
        return 'warning';
      case 'settings':
        return 'success';
      default:
        return 'neutral';
    }
  };

  // Table columns
  const columns = [
    {
      key: 'resource',
      label: 'Permission',
      sortable: true,
      render: (_: string, record: Permission) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="font-medium text-base-content">
              {record.resource}:{record.action}
            </div>
            <div className="text-sm text-base-content/70">{record.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'resource',
      label: 'Resource',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={getPermissionBadgeVariant(value)}
          size="sm"
        >
          <Tag className="w-3 h-3 mr-1" />
          {value}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant="neutral"
          size="sm"
        >
          <Lock className="w-3 h-3 mr-1" />
          {value}
        </Badge>
      ),
    },
    {
      key: 'is_system',
      label: 'Type',
      sortable: true,
      render: (value: boolean) => (
        <Badge
          variant={value ? 'warning' : 'neutral'}
          size="sm"
        >
          {value ? (
            <>
              <Settings className="w-3 h-3 mr-1" />
              System
            </>
          ) : (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Custom
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-base-content/70">
          {formatUtils.formatDate(value)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (_: any, record: Permission) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditPermission(record)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeletePermission(record)}
            disabled={record.is_system}
            title="Delete permission"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="dropdown dropdown-end">
            <Button
              variant="ghost"
              size="sm"
              tabIndex={0}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <a>
                  <Shield className="w-4 h-4" />
                  View Details
                </a>
              </li>
              <li>
                <a>
                  <Settings className="w-4 h-4" />
                  Manage Roles
                </a>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Permissions</h1>
          <p className="text-base-content/70 mt-1">
            Manage system permissions and access controls
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreatePermission}
          icon={Plus}
        >
          Create Permission
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search permissions..."
            icon={Search}
            onChange={handleSearchChange}
            fullWidth
          />
        </div>
        <Button variant="outline" icon={Filter}>
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Total Permissions</div>
          <div className="stat-value text-primary">{pagination.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Custom Permissions</div>
          <div className="stat-value text-success">
            {permissions.filter(permission => !permission.is_system).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">System Permissions</div>
          <div className="stat-value text-warning">
            {permissions.filter(permission => permission.is_system).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Resources</div>
          <div className="stat-value text-info">
            {new Set(permissions.map(p => p.resource)).size}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        data={permissions}
        columns={columns}
        loading={loading}
        emptyMessage="No permissions found"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: setPage,
        }}
        className="w-full"
      />

      {/* Permission Form Modal */}
      <PermissionForm
        isOpen={showPermissionForm}
        onClose={() => {
          setShowPermissionForm(false);
          setSelectedPermission(null);
        }}
        onSubmit={handleFormSubmit}
        permission={selectedPermission || undefined}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Permission"
        size="sm"
      >
        <ModalBody>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error/10 mb-4">
              <Trash2 className="h-6 w-6 text-error" />
            </div>
            <h3 className="text-lg font-medium text-base-content mb-2">
              Delete Permission
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Are you sure you want to delete the permission{' '}
              <span className="font-medium">
                {permissionToDelete?.resource}:{permissionToDelete?.action}
              </span>?
              This action cannot be undone and may affect users and roles that depend on this permission.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={handleDeleteConfirm}
            icon={Trash2}
          >
            Delete Permission
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PermissionsPage;