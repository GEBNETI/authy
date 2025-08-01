import React from 'react';
import { z } from 'zod';
import { Crown } from 'lucide-react';
import { Button, Input, Modal, ModalBody, ModalFooter } from '../ui';
import { PermissionSelector } from './PermissionSelector';
import { useForm } from '../../hooks';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '../../types';

// Validation schemas
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  permission_ids: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  permission_ids: z.array(z.string()).optional(),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;
type UpdateRoleFormData = z.infer<typeof updateRoleSchema>;

interface RoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => Promise<void>;
  role?: Role;
  loading?: boolean;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  role,
  loading = false,
}) => {
  const isEditing = !!role;

  // Form for creating role
  const createForm = useForm<CreateRoleFormData>({
    initialValues: {
      name: '',
      description: '',
      permission_ids: [],
    },
    validationSchema: createRoleSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  // Form for updating role
  const updateForm = useForm<UpdateRoleFormData>({
    initialValues: {
      name: role?.name || '',
      description: role?.description || '',
      permission_ids: role?.permissions?.map(p => p.id) || [],
    },
    validationSchema: updateRoleSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  const currentForm = isEditing ? updateForm : createForm;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && isEditing && role) {
      console.log('🔧 RoleForm - Editing role:', role);
      console.log('🔧 RoleForm - Role permissions:', role.permissions);
      const permissionIds = role.permissions?.map(p => p.id) || [];
      console.log('🔧 RoleForm - Setting permission_ids:', permissionIds);
      
      updateForm.setValue('name', role.name);
      updateForm.setValue('description', role.description);
      updateForm.setValue('permission_ids', permissionIds);
    } else if (isOpen && !isEditing) {
      createForm.reset();
    }
  }, [isOpen, isEditing, role?.id]);

  // Handle permissions change
  const handlePermissionsChange = (permissionIds: string[]) => {
    currentForm.setValue('permission_ids', permissionIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Role' : 'Create Role'}
      size="lg"
    >
      <form onSubmit={currentForm.handleSubmit} className="space-y-6">
        <ModalBody>
          {/* Role Name */}
          <Input
            label="Role Name"
            type="text"
            name="name"
            value={currentForm.values.name}
            onChange={currentForm.handleChange('name')}
            onBlur={currentForm.handleBlur('name')}
            error={currentForm.touched.name ? currentForm.errors.name : undefined}
            icon={Crown}
            placeholder="Enter role name"
            fullWidth
            required
          />

          {/* Description */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              name="description"
              value={currentForm.values.description}
              onChange={(e) => currentForm.setValue('description', e.target.value)}
              onBlur={currentForm.handleBlur('description')}
              placeholder="Describe the role and its purpose"
              rows={3}
              className={`textarea textarea-bordered w-full ${
                currentForm.touched.description && currentForm.errors.description
                  ? 'textarea-error'
                  : ''
              }`}
              required
            />
            {currentForm.touched.description && currentForm.errors.description && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {currentForm.errors.description}
                </span>
              </label>
            )}
          </div>

          {/* Permission Selection */}
          <div className="form-control w-full">
            <PermissionSelector
              selectedPermissionIds={currentForm.values.permission_ids || []}
              onPermissionsChange={handlePermissionsChange}
              disabled={loading}
            />
          </div>

          {/* Info for editing */}
          {isEditing && role && (
            <div className="bg-base-200 p-3 rounded-lg mt-6">
              <p className="text-sm text-base-content/70">
                <strong>ID:</strong> {role.id}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Created:</strong> {new Date(role.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Last Updated:</strong> {new Date(role.updated_at).toLocaleDateString()}
              </p>
              {role.is_system && (
                <p className="text-sm text-warning">
                  <strong>System Role:</strong> This is a system role
                </p>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {isEditing ? 'Update Role' : 'Create Role'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default RoleForm;