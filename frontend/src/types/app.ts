import type { User, Application } from './api';

// Auth state types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

// Theme types
export type Theme = 'emerald' | 'dark';

export interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  children?: NavItem[];
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | string;
  onRowClick?: (record: T) => void;
  className?: string;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | undefined;
  };
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Permission types
export interface PermissionCheck {
  resource: string;
  action: string;
}

export interface PermissionContextType {
  hasPermission: (permission: PermissionCheck) => boolean;
  hasAnyPermission: (permissions: PermissionCheck[]) => boolean;
  hasAllPermissions: (permissions: PermissionCheck[]) => boolean;
  userPermissions: Array<{
    resource: string;
    action: string;
  }>;
}

// Loading states
export interface LoadingState {
  [key: string]: boolean;
}

export interface LoadingContextType {
  loadingStates: LoadingState;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
}

// App state (global)
export interface AppState {
  auth: AuthState;
  theme: Theme;
  notifications: Notification[];
  loading: LoadingState;
  selectedApplication: Application | null;
}

// Route types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  protected?: boolean;
  requiredPermission?: PermissionCheck;
  layout?: 'auth' | 'main';
}

// API request state
export interface RequestState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// Filter types (for tables and lists)
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterState {
  [key: string]: any;
}

// Search types
export interface SearchState {
  query: string;
  results: any[];
  loading: boolean;
  error: string | null;
}

// Breadcrumb types
export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

// Dashboard types
export interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}