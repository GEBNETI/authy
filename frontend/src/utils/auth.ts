import type { User } from '../types/api';

// Token management
export const tokenManager = {
  // Get tokens from localStorage
  getAccessToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },

  // Set tokens in localStorage
  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  // Remove tokens from localStorage
  clearTokens: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Check if token exists
  hasToken: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Decode JWT token (simple implementation)
  decodeToken: (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: (token: string): boolean => {
    const decoded = tokenManager.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  },

  // Get token expiration time
  getTokenExpiration: (token: string): Date | null => {
    const decoded = tokenManager.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  },
};

// User management
export const userManager = {
  // Get user from localStorage
  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      return null;
    }
  },

  // Set user in localStorage
  setUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Remove user from localStorage
  removeUser: (): void => {
    localStorage.removeItem('user');
  },

  // Get user full name
  getUserFullName: (user: User): string => {
    return `${user.first_name} ${user.last_name}`.trim();
  },

  // Get user initials
  getUserInitials: (user: User): string => {
    const firstName = user.first_name?.charAt(0) || '';
    const lastName = user.last_name?.charAt(0) || '';
    return (firstName + lastName).toUpperCase();
  },
};

// Permission utilities
export const permissionUtils = {
  // Check if user has specific permission
  hasPermission: (user: User, resource: string, action: string): boolean => {
    const permissionString = `${resource}:${action}`;
    
    // Check if user has permissions array from login response
    if ((user as any).permissions && Array.isArray((user as any).permissions)) {
      return (user as any).permissions.includes(permissionString);
    }
    
    // Fallback to checking roles structure
    if (!user.roles || user.roles.length === 0) return false;
    
    return user.roles.some(userRole => {
      if (!userRole.role.permissions) return false;
      
      return userRole.role.permissions.some(permission => 
        permission.resource === resource && permission.action === action
      );
    });
  },

  // Check if user has any of the specified permissions
  hasAnyPermission: (user: User, permissions: Array<{ resource: string; action: string }>): boolean => {
    return permissions.some(permission => 
      permissionUtils.hasPermission(user, permission.resource, permission.action)
    );
  },

  // Check if user has all of the specified permissions
  hasAllPermissions: (user: User, permissions: Array<{ resource: string; action: string }>): boolean => {
    return permissions.every(permission => 
      permissionUtils.hasPermission(user, permission.resource, permission.action)
    );
  },

  // Get all user permissions
  getUserPermissions: (user: User): Array<{ resource: string; action: string }> => {
    // Check if user has permissions array from login response
    if ((user as any).permissions && Array.isArray((user as any).permissions)) {
      return (user as any).permissions.map((permission: string) => {
        const [resource, action] = permission.split(':');
        return { resource, action };
      });
    }
    
    // Fallback to checking roles structure
    if (!user.roles || user.roles.length === 0) return [];
    
    const permissions: Array<{ resource: string; action: string }> = [];
    
    user.roles.forEach(userRole => {
      if (userRole.role.permissions) {
        userRole.role.permissions.forEach(permission => {
          const exists = permissions.find(p => 
            p.resource === permission.resource && p.action === permission.action
          );
          
          if (!exists) {
            permissions.push({
              resource: permission.resource,
              action: permission.action,
            });
          }
        });
      }
    });
    
    return permissions;
  },

  // Check if user is system admin
  isSystemAdmin: (user: User): boolean => {
    return user.is_system || permissionUtils.hasPermission(user, 'system', 'admin');
  },
};

// Application utilities
export const appUtils = {
  // Get selected application from localStorage
  getSelectedApplication: (): string | null => {
    return localStorage.getItem('selected_application');
  },

  // Set selected application in localStorage
  setSelectedApplication: (applicationId: string): void => {
    localStorage.setItem('selected_application', applicationId);
  },

  // Remove selected application from localStorage
  removeSelectedApplication: (): void => {
    localStorage.removeItem('selected_application');
  },
};

// Validation utilities
export const validationUtils = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password validation
  isValidPassword: (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },

  // Check password strength
  getPasswordStrength: (password: string): 'weak' | 'medium' | 'strong' => {
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strengthScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
    
    if (strengthScore >= 3) return 'strong';
    if (strengthScore >= 2) return 'medium';
    return 'weak';
  },
};

// Format utilities
export const formatUtils = {
  // Format date
  formatDate: (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  // Format datetime
  formatDateTime: (date: string | Date): string => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Format relative time
  formatRelativeTime: (date: string | Date): string => {
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatUtils.formatDate(date);
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  },
};

// Error handling utilities
export const errorUtils = {
  // Get error message from API response
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    return 'An unexpected error occurred';
  },

  // Check if error is network related
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error');
  },

  // Check if error is authentication related
  isAuthError: (error: any): boolean => {
    return error?.response?.status === 401 || error?.code === 'UNAUTHORIZED';
  },

  // Check if error is permission related
  isPermissionError: (error: any): boolean => {
    return error?.response?.status === 403 || error?.code === 'FORBIDDEN';
  },
};