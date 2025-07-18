import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  bordered?: boolean;
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  compact = false,
  bordered = false,
  shadow = 'md',
  padding = 'md',
}) => {
  const baseClasses = 'card bg-base-100';
  
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = [
    baseClasses,
    shadowClasses[shadow],
    bordered ? 'border border-base-300' : '',
    compact ? 'card-compact' : '',
    paddingClasses[padding],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`card-body ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={`card-title ${className}`}>
      {children}
    </h2>
  );
};

interface CardActionsProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end';
}

export const CardActions: React.FC<CardActionsProps> = ({ 
  children, 
  className = '',
  justify = 'end'
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  return (
    <div className={`card-actions ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  );
};

export default Card;