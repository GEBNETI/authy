import React from 'react';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  firstName = '',
  lastName = '',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className={`avatar ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full 
          bg-primary 
          text-primary-content 
          font-semibold 
          uppercase
          relative
          overflow-hidden
        `}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            lineHeight: '1',
            letterSpacing: '0.025em'
          }}
        >
          {initials}
        </div>
      </div>
    </div>
  );
};

export default Avatar;