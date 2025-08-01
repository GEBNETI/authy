import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Building,
  Search,
  X,
  UserCheck
} from 'lucide-react';
import { 
  Modal, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Badge,
  Input,
  Select
} from '../ui';
import { useApplications, useRoles } from '../../hooks';
import { useNotification } from '../../context';
import { usersApi } from '../../services/api';
import type { User, Role, Application } from '../../types';

interface UserRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onRolesUpdated?: () => void;
}

export const UserRolesModal: React.FC<UserRolesModalProps> = ({
  isOpen,
  onClose,
  user,
  onRolesUpdated,
}) => {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { addNotification } = useNotification();
  
  // Fetch applications
  const { applications = [], loading: loadingApplications } = useApplications({
    limit: 100, // Get all applications
  });
  
  // Fetch roles for selected application
  const { roles = [], loading: loadingRoles, refetch: refetchRoles } = useRoles({
    limit: 100,
    autoFetch: false,
  });
  
  // Load roles when application is selected
  useEffect(() => {
    if (selectedApplicationId) {
      refetchRoles();
    }
  }, [selectedApplicationId, refetchRoles]);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedApplicationId('');
      setSelectedRoleId('');
      setSearchTerm('');
    }
  }, [isOpen]);
  
  // Filter user's current roles by search term
  const filteredUserRoles = user?.roles?.filter(userRole => {
    const matchesSearch = !searchTerm || 
      userRole.role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userRole.role.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];
  
  // Filter available roles (exclude already assigned roles)
  const assignedRoleIds = user?.roles?.map(ur => ur.role.id) || [];
  const availableRoles = roles.filter(role => 
    role.application_id === selectedApplicationId && 
    !assignedRoleIds.includes(role.id)
  );
  
  // Handle assign role
  const handleAssignRole = async () => {
    if (!user || !selectedRoleId || !selectedApplicationId) return;
    
    setLoading(true);
    try {
      await usersApi.assignRole(user.id, {
        role_id: selectedRoleId,
        application_id: selectedApplicationId,
      });
      
      addNotification({
        type: 'success',
        title: 'Role Assigned',
        message: 'Role has been assigned successfully.',
      });
      
      // Reset selections
      setSelectedRoleId('');
      setSelectedApplicationId('');
      
      // Callback to refresh user data
      if (onRolesUpdated) {
        onRolesUpdated();
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error Assigning Role',
        message: error.message || 'Failed to assign role.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle remove role
  const handleRemoveRole = async (roleId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await usersApi.removeRole(user.id, roleId);
      
      addNotification({
        type: 'success',
        title: 'Role Removed',
        message: 'Role has been removed successfully.',
      });
      
      // Callback to refresh user data
      if (onRolesUpdated) {
        onRolesUpdated();
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error Removing Role',
        message: error.message || 'Failed to remove role.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Group roles by application
  const rolesByApplication = (filteredUserRoles || []).reduce((acc, userRole) => {
    const appId = userRole.application_id;
    if (!acc[appId]) {
      acc[appId] = {
        application: applications.find(app => app.id === appId),
        roles: [],
      };
    }
    acc[appId].roles.push(userRole);
    return acc;
  }, {} as Record<string, { application?: Application; roles: typeof filteredUserRoles }>);
  
  if (!user) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage User Roles"
      size="lg"
    >
      <ModalBody>
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-base-content">
                  {user.first_name} {user.last_name}
                </h3>
                <p className="text-sm text-base-content/70">{user.email}</p>
              </div>
            </div>
          </div>
          
          {/* Assign New Role */}
          <div className="border border-base-300 rounded-lg p-4">
            <h4 className="font-medium text-base-content mb-4 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Assign New Role
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={selectedApplicationId}
                onChange={(e) => {
                  setSelectedApplicationId(e.target.value);
                  setSelectedRoleId('');
                }}
                disabled={loadingApplications}
                placeholder={loadingApplications ? 'Loading applications...' : 'Select Application'}
                options={applications.map(app => ({
                  value: app.id,
                  label: app.name,
                }))}
              />
              
              <Select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={!selectedApplicationId || loadingRoles}
                placeholder={
                  !selectedApplicationId 
                    ? 'Select application first' 
                    : loadingRoles 
                    ? 'Loading roles...' 
                    : 'Select Role'
                }
                options={availableRoles.map(role => ({
                  value: role.id,
                  label: role.name,
                }))}
              />
            </div>
            
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAssignRole}
                disabled={!selectedRoleId || !selectedApplicationId || loading}
                icon={Shield}
              >
                Assign Role
              </Button>
            </div>
          </div>
          
          {/* Current Roles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-base-content flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Current Roles ({filteredUserRoles.length})
              </h4>
              
              {/* Search */}
              <div className="w-64">
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                  size="sm"
                />
              </div>
            </div>
            
            {filteredUserRoles.length === 0 ? (
              <div className="text-center py-8 text-base-content/70">
                {searchTerm ? 'No roles match your search.' : 'No roles assigned yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(rolesByApplication).map(([appId, { application, roles }]) => (
                  <div key={appId} className="border border-base-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-base-content/70" />
                        <h5 className="font-medium text-base-content">
                          {application?.name || 'Unknown Application'}
                        </h5>
                        <Badge variant="neutral" size="xs">
                          {roles.length} {roles.length === 1 ? 'role' : 'roles'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {roles.map(userRole => (
                        <div 
                          key={userRole.role.id} 
                          className="flex items-center justify-between p-3 bg-base-100 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-base-content">
                                {userRole.role.name}
                              </span>
                              {userRole.role.is_system && (
                                <Badge variant="warning" size="xs">System</Badge>
                              )}
                            </div>
                            {userRole.role.description && (
                              <p className="text-sm text-base-content/70 mt-1">
                                {userRole.role.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="info" size="xs">
                                {userRole.role.permissions?.length || 0} permissions
                              </Badge>
                              {userRole.granted_at && (
                                <span className="text-xs text-base-content/50">
                                  Granted {new Date(userRole.granted_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(userRole.role.id)}
                            disabled={loading || userRole.role.is_system}
                            title={userRole.role.is_system ? 'Cannot remove system role' : 'Remove role'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      
      <ModalFooter>
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default UserRolesModal;