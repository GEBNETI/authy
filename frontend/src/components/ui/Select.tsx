import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  variant?: 'bordered' | 'ghost' | 'primary';
  selectSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    options,
    placeholder = 'Select an option',
    fullWidth = false,
    variant = 'bordered',
    selectSize = 'md',
    className = '',
    ...props
  }, ref) => {
    const baseClasses = 'select';
    
    const variantClasses = {
      bordered: 'select-bordered',
      ghost: 'select-ghost',
      primary: 'select-primary',
    };

    const sizeClasses = {
      xs: 'select-xs',
      sm: 'select-sm',
      md: '',
      lg: 'select-lg',
    };

    const selectClasses = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[selectSize],
      fullWidth ? 'w-full' : '',
      error ? 'select-error' : '',
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
          <select
            ref={ref}
            className={selectClasses}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
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

Select.displayName = 'Select';

export default Select;