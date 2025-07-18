import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  variant?: 'bordered' | 'ghost' | 'primary';
  inputSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    variant = 'bordered',
    inputSize = 'md',
    className = '',
    ...props
  }, ref) => {
    const baseClasses = 'input';
    
    const variantClasses = {
      bordered: 'input-bordered',
      ghost: 'input-ghost',
      primary: 'input-primary',
    };

    const sizeClasses = {
      xs: 'input-xs',
      sm: 'input-sm',
      md: '',
      lg: 'input-lg',
    };

    const inputClasses = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[inputSize],
      fullWidth ? 'w-full' : '',
      error ? 'input-error' : '',
      Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div className={`form-control ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="label">
            <span className="label-text">{label}</span>
          </label>
        )}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="w-5 h-5 text-base-content/40" />
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          {Icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Icon className="w-5 h-5 text-base-content/40" />
            </div>
          )}
        </div>
        {error && (
          <label className="label">
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;