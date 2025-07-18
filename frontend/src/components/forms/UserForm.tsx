import React from 'react';
import { z } from 'zod';
import { Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Select, Modal, ModalBody, ModalFooter } from '../ui';
import { useForm } from '../../hooks';
import type { User as UserType, CreateUserRequest, UpdateUserRequest } from '../../types';

// Validation schemas
const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  is_active: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const updateUserSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  is_active: z.boolean().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  user?: UserType;
  loading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const isEditing = !!user;

  // Form for creating user
  const createForm = useForm<CreateUserFormData>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      is_active: true,
    },
    validationSchema: createUserSchema,
    onSubmit: async (data) => {
      const { confirmPassword, ...userData } = data;
      await onSubmit(userData);
      onClose();
    },
  });

  // Form for updating user
  const updateForm = useForm<UpdateUserFormData>({
    initialValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      is_active: user?.is_active ?? true,
    },
    validationSchema: updateUserSchema,
    onSubmit: async (data) => {
      await onSubmit(data);
      onClose();
    },
  });

  const currentForm = isEditing ? updateForm : createForm;

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && isEditing && user) {
      updateForm.setValue('first_name', user.first_name);
      updateForm.setValue('last_name', user.last_name);
      updateForm.setValue('is_active', user.is_active);
    } else if (isOpen && !isEditing) {
      createForm.reset();
    }
  }, [isOpen, isEditing, user?.id]);

  const statusOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User' : 'Create User'}
      size="md"
    >
      <form onSubmit={currentForm.handleSubmit} className="space-y-4">
        <ModalBody>
          {/* Email (only for create) */}
          {!isEditing && (
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={createForm.values.email}
              onChange={createForm.handleChange('email')}
              onBlur={createForm.handleBlur('email')}
              error={createForm.touched.email ? createForm.errors.email : undefined}
              icon={Mail}
              placeholder="Enter email address"
              fullWidth
              required
            />
          )}

          {/* First Name */}
          <Input
            label="First Name"
            type="text"
            name="first_name"
            value={currentForm.values.first_name}
            onChange={currentForm.handleChange('first_name')}
            onBlur={currentForm.handleBlur('first_name')}
            error={currentForm.touched.first_name ? currentForm.errors.first_name : undefined}
            icon={User}
            placeholder="Enter first name"
            fullWidth
            required
          />

          {/* Last Name */}
          <Input
            label="Last Name"
            type="text"
            name="last_name"
            value={currentForm.values.last_name}
            onChange={currentForm.handleChange('last_name')}
            onBlur={currentForm.handleBlur('last_name')}
            error={currentForm.touched.last_name ? currentForm.errors.last_name : undefined}
            icon={User}
            placeholder="Enter last name"
            fullWidth
            required
          />

          {/* Password (only for create) */}
          {!isEditing && (
            <>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={createForm.values.password}
                  onChange={createForm.handleChange('password')}
                  onBlur={createForm.handleBlur('password')}
                  error={createForm.touched.password ? createForm.errors.password : undefined}
                  icon={Lock}
                  placeholder="Enter password"
                  fullWidth
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-base-content/40 hover:text-base-content/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={createForm.values.confirmPassword}
                  onChange={createForm.handleChange('confirmPassword')}
                  onBlur={createForm.handleBlur('confirmPassword')}
                  error={createForm.touched.confirmPassword ? createForm.errors.confirmPassword : undefined}
                  icon={Lock}
                  placeholder="Confirm password"
                  fullWidth
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-base-content/40 hover:text-base-content/60"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}

          {/* Status */}
          <Select
            label="Status"
            name="is_active"
            value={String(currentForm.values.is_active)}
            onChange={(e) => currentForm.setValue('is_active', e.target.value === 'true')}
            options={statusOptions}
            fullWidth
          />

          {/* Info for editing */}
          {isEditing && user && (
            <div className="bg-base-200 p-3 rounded-lg mt-6">
              <p className="text-sm text-base-content/70">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-sm text-base-content/70">
                <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
              </p>
              {user.is_system && (
                <p className="text-sm text-warning">
                  <strong>System User:</strong> This is a system user
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
            {isEditing ? 'Update User' : 'Create User'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default UserForm;