import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  UserMinus, 
  Shield, 
  MoreVertical,
  UserCheck,
  UserX
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Table, 
  Badge, 
  Modal, 
  ModalBody, 
  ModalFooter,
  Avatar
} from '../../components/ui';
import { UserForm, UserRolesModal } from '../../components/forms';
import { useUsers } from '../../hooks';
import type { User, CreateUserRequest, UpdateUserRequest } from '../../types';
import { utils, formatUtils } from '../../utils';

const UsersPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [userForRoles, setUserForRoles] = useState<User | null>(null);

  const {
    users,
    loading,
    pagination,
    setSearch,
    setPage,
    createUser,
    updateUser,
    refetch,
  } = useUsers();

  // Debounced search
  const debouncedSearch = useMemo(
    () => utils.debounce((value: string) => setSearch(value), 300),
    [setSearch]
  );

  // Update modal user when users list changes (after refetch)
  useEffect(() => {
    if (userForRoles && users.length > 0) {
      const updatedUser = users.find(u => u.id === userForRoles.id);
      if (updatedUser) {
        setUserForRoles(updatedUser);
      }
    }
  }, [users, userForRoles]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle create user
  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  // Handle manage roles
  const handleManageRoles = (user: User) => {
    setUserForRoles(user);
    setShowRolesModal(true);
  };

  // Handle form submit
  const handleFormSubmit = async (data: CreateUserRequest | UpdateUserRequest) => {
    setFormLoading(true);
    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, data as UpdateUserRequest);
      } else {
        await createUser(data as CreateUserRequest);
      }
      setShowUserForm(false);
      setSelectedUser(null);
    } catch (error) {
      // Error handled by useUsers hook
    } finally {
      setFormLoading(false);
    }
  };

  // Handle user status change (activate/deactivate)
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // Toggle the user's active status
      const newStatus = !userToDelete.is_active;
      await updateUser(userToDelete.id, {
        first_name: userToDelete.first_name,
        last_name: userToDelete.last_name,
        is_active: newStatus,
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      // Error handled by useUsers hook
    }
  };

  // Table columns
  const columns = [
    {
      key: 'email',
      label: 'User',
      sortable: true,
      render: (value: string, record: User) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            firstName={record.first_name} 
            lastName={record.last_name} 
            size="md"
          />
          <div>
            <div className="font-medium text-base-content">
              {record.first_name} {record.last_name}
            </div>
            <div className="text-sm text-base-content/70">{value}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <Badge
          variant={value ? 'success' : 'error'}
          size="sm"
        >
          {value ? (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <UserX className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (_: any, record: User) => (
        <div className="flex flex-wrap gap-1">
          {record.roles && record.roles.length > 0 ? (
            record.roles.slice(0, 2).map((userRole, index) => (
              <Badge
                key={index}
                variant="primary"
                size="xs"
                outline
              >
                {userRole.role_name}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-base-content/40">No roles</span>
          )}
          {record.roles && record.roles.length > 2 && (
            <Badge variant="neutral" size="xs">
              +{record.roles.length - 2}
            </Badge>
          )}
        </div>
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
      render: (_: any, record: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditUser(record)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(record)}
            disabled={record.is_system}
            title={record.is_active ? "Deactivate user" : "Activate user"}
          >
            {record.is_active ? (
              <UserMinus className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
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
                <a onClick={() => handleManageRoles(record)}>
                  <Shield className="w-4 h-4" />
                  Manage Roles
                </a>
              </li>
              <li>
                <a>
                  <UserCheck className="w-4 h-4" />
                  View Activity
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
          <h1 className="text-2xl font-bold text-base-content">Users</h1>
          <p className="text-base-content/70 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateUser}
          icon={Plus}
        >
          Create User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search users..."
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
          <div className="stat-title">Total Users</div>
          <div className="stat-value text-primary">{pagination.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Active Users</div>
          <div className="stat-value text-success">
            {users.filter(u => u.is_active).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Inactive Users</div>
          <div className="stat-value text-error">
            {users.filter(u => !u.is_active).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">System Users</div>
          <div className="stat-value text-warning">
            {users.filter(u => u.is_system).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        data={users}
        columns={columns}
        loading={loading}
        emptyMessage="No users found"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: setPage,
        }}
        className="w-full"
      />

      {/* User Form Modal */}
      <UserForm
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setSelectedUser(null);
        }}
        onSubmit={handleFormSubmit}
        user={selectedUser || undefined}
        loading={formLoading}
      />

      {/* User Roles Modal */}
      <UserRolesModal
        isOpen={showRolesModal}
        onClose={() => {
          setShowRolesModal(false);
          setUserForRoles(null);
        }}
        user={userForRoles}
        onRolesUpdated={async () => {
          // Refetch all users to get updated roles across all applications
          await refetch();
        }}
      />

      {/* User Status Change Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={userToDelete?.is_active ? "Deactivate User" : "Activate User"}
        size="sm"
      >
        <ModalBody>
          <div className="text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              userToDelete?.is_active ? 'bg-warning/10' : 'bg-success/10'
            }`}>
              {userToDelete?.is_active ? (
                <UserMinus className="h-6 w-6 text-warning" />
              ) : (
                <UserCheck className="h-6 w-6 text-success" />
              )}
            </div>
            <h3 className="text-lg font-medium text-base-content mb-2">
              {userToDelete?.is_active ? 'Deactivate User' : 'Activate User'}
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Are you sure you want to {userToDelete?.is_active ? 'deactivate' : 'activate'}{' '}
              <span className="font-medium">
                {userToDelete?.first_name} {userToDelete?.last_name}
              </span>
              ? {userToDelete?.is_active 
                ? 'This will disable their access to the system.' 
                : 'This will restore their access to the system.'
              }
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
            variant={userToDelete?.is_active ? "warning" : "success"}
            onClick={handleDeleteConfirm}
            icon={userToDelete?.is_active ? UserMinus : UserCheck}
          >
            {userToDelete?.is_active ? 'Deactivate User' : 'Activate User'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default UsersPage;