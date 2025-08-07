import React, { useState } from 'react';
import { Search, Shield, Check } from 'lucide-react';
import { Button, Input, Badge } from '../ui';
import { useAllPermissions } from '../../hooks';

interface PermissionSelectorProps {
  selectedPermissionIds: string[];
  onPermissionsChange: (permissionIds: string[]) => void;
  disabled?: boolean;
  originalPermissionIds?: string[]; // To show what has changed
}

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissionIds,
  onPermissionsChange,
  disabled = false,
  originalPermissionIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState<string>('all');

  // Use the dedicated hook to get ALL permissions without pagination
  const { permissions, loading } = useAllPermissions();

  // Filter permissions based on search and resource
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResource = selectedResource === 'all' || permission.resource === selectedResource;
    
    return matchesSearch && matchesResource;
  });

  // Get unique resources for filtering
  const resources = ['all', ...Array.from(new Set(permissions.map(p => p.resource)))];

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string) => {
    if (disabled) return;
    
    const isSelected = selectedPermissionIds.includes(permissionId);
    let newSelectedIds: string[];
    
    if (isSelected) {
      newSelectedIds = selectedPermissionIds.filter(id => id !== permissionId);
    } else {
      newSelectedIds = [...selectedPermissionIds, permissionId];
    }
    
    onPermissionsChange(newSelectedIds);
  };

  // Handle select all for filtered permissions
  const handleSelectAllFiltered = () => {
    if (disabled) return;
    
    const filteredIds = filteredPermissions.map(p => p.id);
    const allFilteredSelected = filteredIds.every(id => selectedPermissionIds.includes(id));
    
    if (allFilteredSelected) {
      // Deselect all filtered permissions
      const newSelectedIds = selectedPermissionIds.filter(id => !filteredIds.includes(id));
      onPermissionsChange(newSelectedIds);
    } else {
      // Select all filtered permissions
      const newSelectedIds = Array.from(new Set([...selectedPermissionIds, ...filteredIds]));
      onPermissionsChange(newSelectedIds);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    if (disabled) return;
    onPermissionsChange([]);
  };

  // Check if all filtered permissions are selected
  const allFilteredSelected = filteredPermissions.length > 0 && 
    filteredPermissions.every(p => selectedPermissionIds.includes(p.id));

  // Check if there are unsaved changes
  const hasChanges = originalPermissionIds.length !== selectedPermissionIds.length ||
    !originalPermissionIds.every(id => selectedPermissionIds.includes(id)) ||
    !selectedPermissionIds.every(id => originalPermissionIds.includes(id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-base-content">
          Assign Permissions
        </h3>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="warning" size="sm">
              Unsaved Changes
            </Badge>
          )}
          <div className="text-sm text-base-content/70">
            {selectedPermissionIds.length} of {permissions.length} selected
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search permissions..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            disabled={disabled}
          />
        </div>
        <select
          className="select select-bordered"
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
          disabled={disabled}
        >
          {resources.map(resource => (
            <option key={resource} value={resource}>
              {resource === 'all' ? 'All Resources' : resource}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAllFiltered}
          disabled={disabled || filteredPermissions.length === 0}
        >
          {allFilteredSelected ? 'Deselect All' : 'Select All'} Filtered
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={disabled || selectedPermissionIds.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Permissions List */}
      <div className="border border-base-300 rounded-lg max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="loading loading-spinner loading-md"></div>
            <p className="text-sm text-base-content/70 mt-2">Loading permissions...</p>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="p-4 text-center text-base-content/70">
            {searchTerm ? 'No permissions match your search.' : 'No permissions available.'}
          </div>
        ) : (
          <div className="divide-y divide-base-300">
            {filteredPermissions.map((permission) => {
              const isSelected = selectedPermissionIds.includes(permission.id);
              
              return (
                <div
                  key={permission.id}
                  className={`p-4 cursor-pointer hover:bg-base-200 transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => handlePermissionToggle(permission.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                      isSelected ? 'bg-primary text-primary-content' : 'bg-base-300'
                    }`}>
                      {isSelected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-base-content">
                          {permission.resource}:{permission.action}
                        </span>
                        {permission.is_system && (
                          <Badge variant="warning" size="xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-base-content/70 mt-1">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Permissions Summary */}
      {selectedPermissionIds.length > 0 && (
        <div className="bg-base-200 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-base-content mb-2">
            Selected Permissions ({selectedPermissionIds.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {permissions
              .filter(p => selectedPermissionIds.includes(p.id))
              .slice(0, 10)
              .map(permission => (
                <Badge key={permission.id} variant="primary" size="xs">
                  {permission.resource}:{permission.action}
                </Badge>
              ))}
            {selectedPermissionIds.length > 10 && (
              <Badge variant="neutral" size="xs">
                +{selectedPermissionIds.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionSelector;