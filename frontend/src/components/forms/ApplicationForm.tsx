import React from 'react';
import { z } from 'zod';
import { Globe } from 'lucide-react';
import { Button, Input, Modal, ModalBody, ModalFooter } from '../ui';
import { useForm } from '../../hooks';
import type { Application, CreateApplicationRequest, UpdateApplicationRequest } from '../../types';

// Validation schemas
const createApplicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Application name is required')
    .max(100, 'Application name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
});

const updateApplicationSchema = z.object({
  name: z
    .string()
    .min(1, 'Application name is required')
    .max(100, 'Application name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
});

type CreateApplicationFormData = z.infer<typeof createApplicationSchema>;
type UpdateApplicationFormData = z.infer<typeof updateApplicationSchema>;

interface ApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApplicationRequest | UpdateApplicationRequest) => Promise<void>;
  application?: Application;
  loading?: boolean;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  application,
  loading = false,
}) => {
  const isEditing = !!application;

  // Form for creating application
  const createForm = useForm<CreateApplicationFormData>({
    initialValues: {
      name: '',
      description: '',
    },
    validationSchema: createApplicationSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  // Form for updating application
  const updateForm = useForm<UpdateApplicationFormData>({
    initialValues: {
      name: application?.name || '',
      description: application?.description || '',
    },
    validationSchema: updateApplicationSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  const currentForm = isEditing ? updateForm : createForm;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && isEditing && application) {
      updateForm.setValue('name', application.name);
      updateForm.setValue('description', application.description);
    } else if (isOpen && !isEditing) {
      createForm.reset();
    }
  }, [isOpen, isEditing, application?.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Application' : 'Create Application'}
      size="md"
    >
      <form onSubmit={currentForm.handleSubmit} className="space-y-4">
        <ModalBody>
          {/* Application Name */}
          <Input
            label="Application Name"
            type="text"
            name="name"
            value={currentForm.values.name}
            onChange={currentForm.handleChange('name')}
            onBlur={currentForm.handleBlur('name')}
            error={currentForm.touched.name ? currentForm.errors.name : undefined}
            icon={Globe}
            placeholder="Enter application name"
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
              placeholder="Enter application description"
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
          {isEditing && application && (
            <div className="bg-base-200 p-3 rounded-lg mt-6">
              <p className="text-sm text-base-content/70">
                <strong>ID:</strong> {application.id}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Created:</strong> {new Date(application.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Last Updated:</strong> {new Date(application.updated_at).toLocaleDateString()}
              </p>
              {application.is_system && (
                <p className="text-sm text-warning">
                  <strong>System Application:</strong> This is a system application
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
            {isEditing ? 'Update Application' : 'Create Application'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default ApplicationForm;