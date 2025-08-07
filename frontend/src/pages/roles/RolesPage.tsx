import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  Crown,
  Shield,
  Settings,
  Users,
  Key
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
import { RoleForm, PermissionSelector } from '../../components/forms';
import { useRoles } from '../../hooks';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '../../types';
import { utils, formatUtils } from '../../utils';

const RolesPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [localPermissionIds, setLocalPermissionIds] = useState<string[]>([]);

  const {
    roles,
    loading,
    pagination,
    setSearch,
    setPage,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
  } = useRoles();

  // Debounced search
  const debouncedSearch = useMemo(
    () => utils.debounce((value: string) => setSearch(value), 300),
    [setSearch]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle create role
  const handleCreateRole = () => {
    setSelectedRole(null);
    setShowRoleForm(true);
  };

  // Handle edit role
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleForm(true);
  };

  // Handle delete role
  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  // Handle manage permissions
  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    // Initialize local state with current role permissions
    setLocalPermissionIds(role.permissions?.map(p => p.id) || []);
    setShowPermissionsModal(true);
  };

  // Handle form submit
  const handleFormSubmit = async (data: CreateRoleRequest | UpdateRoleRequest) => {
    setFormLoading(true);
    try {
      if (selectedRole) {
        // UPDATING EXISTING ROLE
        // Extract permission_ids from the update data
        const { permission_ids, ...roleUpdateData } = data as UpdateRoleRequest & { permission_ids?: string[] };
        
        // Update the role metadata (name, description)
        await updateRole(selectedRole.id, roleUpdateData);
        
        // If permissions have changed, update them too
        if (permission_ids !== undefined) {
          const originalPermissionIds = selectedRole.permissions?.map(p => p.id) || [];
          const hasPermissionChanges = 
            permission_ids.length !== originalPermissionIds.length ||
            !permission_ids.every(id => originalPermissionIds.includes(id)) ||
            !originalPermissionIds.every(id => permission_ids.includes(id));
          
          if (hasPermissionChanges) {
            await assignPermissions(selectedRole.id, permission_ids);
          }
        }
      } else {
        // CREATING NEW ROLE
        // Extract permission_ids from the create data
        const { permission_ids, ...roleCreateData } = data as CreateRoleRequest & { permission_ids?: string[] };
        
        // Create the role first
        const newRole = await createRole(roleCreateData);
        
        // If permissions were provided, assign them to the new role
        if (permission_ids && permission_ids.length > 0 && newRole?.id) {
          await assignPermissions(newRole.id, permission_ids);
        }
      }
      setShowRoleForm(false);
      setSelectedRole(null);
    } catch (error) {
      // Error handled by useRoles hook
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRole(roleToDelete.id);
      setShowDeleteModal(false);
      setRoleToDelete(null);
    } catch (error) {
      // Error handled by useRoles hook
    }
  };

  // Handle local permissions change (no API call)
  const handleLocalPermissionsChange = (permissionIds: string[]) => {
    setLocalPermissionIds(permissionIds);
  };

  // Handle permissions save (API call)
  const handlePermissionsSave = async () => {
    if (!selectedRole) return;

    try {
      setFormLoading(true);
      await assignPermissions(selectedRole.id, localPermissionIds);
      setShowPermissionsModal(false);
      setSelectedRole(null);
      setLocalPermissionIds([]);
    } catch (error) {
      // Error handled by useRoles hook
    } finally {
      setFormLoading(false);
    }
  };

  // Handle permissions cancel
  const handlePermissionsCancel = () => {
    setShowPermissionsModal(false);
    setSelectedRole(null);
    setLocalPermissionIds([]);
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Role',
      sortable: true,
      render: (_: string, record: Role) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
            <Crown className="w-5 h-5 text-warning" />
          </div>
          <div>
            <div className="font-medium text-base-content">{record.name}</div>
            <div className="text-sm text-base-content/70">{record.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (_: any, record: Role) => (
        <div className="flex flex-wrap gap-1">
          {record.permissions && record.permissions.length > 0 ? (
            <>
              {record.permissions.slice(0, 3).map((permission, index) => (
                <Badge
                  key={index}
                  variant="info"
                  size="xs"
                >
                  {permission.resource}:{permission.action}
                </Badge>
              ))}
              {record.permissions.length > 3 && (
                <Badge variant="neutral" size="xs">
                  +{record.permissions.length - 3} more
                </Badge>
              )}
            </>
          ) : (
            <span className="text-sm text-base-content/40">No permissions</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_system',
      label: 'Type',
      sortable: true,
      render: (value: boolean) => (
        <Badge
          variant={value ? 'warning' : 'primary'}
          size="sm"
        >
          {value ? (
            <>
              <Settings className="w-3 h-3 mr-1" />
              System
            </>
          ) : (
            <>
              <Crown className="w-3 h-3 mr-1" />
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
      render: (_: any, record: Role) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditRole(record)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRole(record)}
            disabled={record.is_system}
            title="Delete role"
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
                <a onClick={() => handleManagePermissions(record)}>
                  <Shield className="w-4 h-4" />
                  Manage Permissions
                </a>
              </li>
              <li>
                <a>
                  <Users className="w-4 h-4" />
                  View Users
                </a>
              </li>
              <li>
                <a>
                  <Key className="w-4 h-4" />
                  Role Details
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
          <h1 className="text-2xl font-bold text-base-content">Roles</h1>
          <p className="text-base-content/70 mt-1">
            Manage roles and assign permissions to control access
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateRole}
          icon={Plus}
        >
          Create Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search roles..."
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
          <div className="stat-title">Total Roles</div>
          <div className="stat-value text-primary">{pagination.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Custom Roles</div>
          <div className="stat-value text-success">
            {roles.filter(role => !role.is_system).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">System Roles</div>
          <div className="stat-value text-warning">
            {roles.filter(role => role.is_system).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Avg Permissions</div>
          <div className="stat-value text-info">
            {roles.length > 0 
              ? Math.round(roles.reduce((acc, role) => acc + (role.permissions?.length || 0), 0) / roles.length)
              : 0
            }
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        data={roles}
        columns={columns}
        loading={loading}
        emptyMessage="No roles found"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: setPage,
        }}
        className="w-full"
      />

      {/* Role Form Modal */}
      <RoleForm
        isOpen={showRoleForm}
        onClose={() => {
          setShowRoleForm(false);
          setSelectedRole(null);
        }}
        onSubmit={handleFormSubmit}
        role={selectedRole || undefined}
        loading={formLoading}
      />

      {/* Permissions Management Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={handlePermissionsCancel}
        title={`Manage Permissions - ${selectedRole?.name}`}
        size="lg"
      >
        <ModalBody>
          {selectedRole && (
            <PermissionSelector
              selectedPermissionIds={localPermissionIds}
              onPermissionsChange={handleLocalPermissionsChange}
              originalPermissionIds={selectedRole.permissions?.map(p => p.id) || []}
              disabled={formLoading}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={handlePermissionsCancel}
            disabled={formLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePermissionsSave}
            disabled={formLoading}
            loading={formLoading}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Role"
        size="sm"
      >
        <ModalBody>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error/10 mb-4">
              <Trash2 className="h-6 w-6 text-error" />
            </div>
            <h3 className="text-lg font-medium text-base-content mb-2">
              Delete Role
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Are you sure you want to delete the role{' '}
              <span className="font-medium">{roleToDelete?.name}</span>?
              This action cannot be undone and will affect all users assigned to this role.
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
            Delete Role
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RolesPage;