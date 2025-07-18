import React, { useEffect } from 'react';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button, Input } from '../../components/ui';
import { useForm } from '../../hooks';
import { useAuth, useNotification } from '../../context';
import { errorUtils } from '../../utils';

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login, state, clearError } = useAuth();
  const { addNotification } = useNotification();
  const [showPassword, setShowPassword] = React.useState(false);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Form management
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError,
    clearErrors,
  } = useForm<LoginFormData>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (formData) => {
      try {
        clearErrors();
        await login(formData.email, formData.password);
        
        addNotification({
          type: 'success',
          title: 'Welcome back!',
          message: 'You have successfully logged in.',
        });
      } catch (error) {
        const errorMessage = errorUtils.getErrorMessage(error);
        
        // Handle specific error types
        if (errorMessage.toLowerCase().includes('invalid credentials')) {
          setFieldError('email', 'Invalid email or password');
          setFieldError('password', 'Invalid email or password');
        } else if (errorMessage.toLowerCase().includes('email')) {
          setFieldError('email', errorMessage);
        } else {
          addNotification({
            type: 'error',
            title: 'Login Failed',
            message: errorMessage,
          });
        }
      }
    },
  });


  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-base-content">Welcome Back</h2>
          <p className="text-base-content/70">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            icon={Mail}
            placeholder="Enter your email"
            fullWidth
            autoComplete="email"
          />

          {/* Password Field */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={values.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              icon={Lock}
              placeholder="Enter your password"
              fullWidth
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-9 text-base-content/40 hover:text-base-content/60"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="checkbox checkbox-primary checkbox-sm"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-base-content/70">
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-sm text-primary hover:text-primary-focus"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>


        {/* Registration Link */}
        <div className="text-center">
          <p className="text-sm text-base-content/70">
            Don't have an account?{' '}
            <a
              href="#"
              className="text-primary hover:text-primary-focus font-medium"
              onClick={() => {
                addNotification({
                  type: 'info',
                  title: 'Registration',
                  message: 'Please contact your administrator to create an account.',
                });
              }}
            >
              Contact Administrator
            </a>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-base-200 p-4 rounded-lg">
          <h3 className="font-semibold text-sm text-base-content mb-2">Demo Credentials:</h3>
          <div className="text-xs text-base-content/70 space-y-1">
            <p><strong>Email:</strong> admin@authy.dev</p>
            <p><strong>Password:</strong> password</p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;