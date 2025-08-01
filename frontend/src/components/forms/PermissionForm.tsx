import React from 'react';
import { z } from 'zod';
import { Shield, Tag } from 'lucide-react';
import { Button, Input, Modal, ModalBody, ModalFooter } from '../ui';
import { useForm } from '../../hooks';
import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '../../types';

// Validation schemas
const createPermissionSchema = z.object({
  resource: z
    .string()
    .min(1, 'Resource is required')
    .max(100, 'Resource must be less than 100 characters'),
  action: z
    .string()
    .min(1, 'Action is required')
    .max(100, 'Action must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
});

const updatePermissionSchema = z.object({
  resource: z
    .string()
    .min(1, 'Resource is required')
    .max(100, 'Resource must be less than 100 characters'),
  action: z
    .string()
    .min(1, 'Action is required')
    .max(100, 'Action must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
});

type CreatePermissionFormData = z.infer<typeof createPermissionSchema>;
type UpdatePermissionFormData = z.infer<typeof updatePermissionSchema>;

interface PermissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePermissionRequest | UpdatePermissionRequest) => Promise<void>;
  permission?: Permission;
  loading?: boolean;
}

export const PermissionForm: React.FC<PermissionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  permission,
  loading = false,
}) => {
  const isEditing = !!permission;

  // Form for creating permission
  const createForm = useForm<CreatePermissionFormData>({
    initialValues: {
      resource: '',
      action: '',
      description: '',
    },
    validationSchema: createPermissionSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  // Form for updating permission
  const updateForm = useForm<UpdatePermissionFormData>({
    initialValues: {
      resource: permission?.resource || '',
      action: permission?.action || '',
      description: permission?.description || '',
    },
    validationSchema: updatePermissionSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  const currentForm = isEditing ? updateForm : createForm;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && isEditing && permission) {
      updateForm.setValue('resource', permission.resource);
      updateForm.setValue('action', permission.action);
      updateForm.setValue('description', permission.description);
    } else if (isOpen && !isEditing) {
      createForm.reset();
    }
  }, [isOpen, isEditing, permission?.id]);


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Permission' : 'Create Permission'}
      size="md"
    >
      <form onSubmit={currentForm.handleSubmit} className="space-y-4">
        <ModalBody>
          {/* Resource */}
          <div className="form-control w-full">
            <Input
              label="Resource"
              type="text"
              name="resource"
              value={currentForm.values.resource}
              onChange={currentForm.handleChange('resource')}
              onBlur={currentForm.handleBlur('resource')}
              error={currentForm.touched.resource ? currentForm.errors.resource : undefined}
              icon={Tag}
              placeholder="e.g., users, applications, permissions"
              fullWidth
              required
            />
            <label className="label">
              <span className="label-text-alt text-base-content/70">
                Common: users, applications, permissions, roles, audit, settings
              </span>
            </label>
          </div>

          {/* Action */}
          <div className="form-control w-full">
            <Input
              label="Action"
              type="text"
              name="action"
              value={currentForm.values.action}
              onChange={currentForm.handleChange('action')}
              onBlur={currentForm.handleBlur('action')}
              error={currentForm.touched.action ? currentForm.errors.action : undefined}
              icon={Shield}
              placeholder="e.g., create, read, update, delete"
              fullWidth
              required
            />
            <label className="label">
              <span className="label-text-alt text-base-content/70">
                Common: create, read, update, delete, list, manage
              </span>
            </label>
          </div>

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
              placeholder="Describe what this permission allows"
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

          {/* Info for editing */}
          {isEditing && permission && (
            <div className="bg-base-200 p-3 rounded-lg mt-6">
              <p className="text-sm text-base-content/70">
                <strong>ID:</strong> {permission.id}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Created:</strong> {new Date(permission.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Last Updated:</strong> {new Date(permission.updated_at).toLocaleDateString()}
              </p>
              {permission.is_system && (
                <p className="text-sm text-warning">
                  <strong>System Permission:</strong> This is a system permission
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
            {isEditing ? 'Update Permission' : 'Create Permission'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default PermissionForm;