import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  outline?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  outline = false,
  className = '',
}) => {
  const baseClasses = 'badge';
  
  const variantClasses = {
    primary: outline ? 'badge-outline badge-primary' : 'badge-primary',
    secondary: outline ? 'badge-outline badge-secondary' : 'badge-secondary',
    success: outline ? 'badge-outline badge-success' : 'badge-success',
    warning: outline ? 'badge-outline badge-warning' : 'badge-warning',
    error: outline ? 'badge-outline badge-error' : 'badge-error',
    info: outline ? 'badge-outline badge-info' : 'badge-info',
    neutral: outline ? 'badge-outline badge-neutral' : 'badge-neutral',
  };

  const sizeClasses = {
    xs: 'badge-xs',
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;