// Base types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
  application?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token_pair: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  user: User;
  application: {
    id: string;
    name: string;
    description: string;
  };
  permissions: string[];
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: User;
  expires_at?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  roles?: UserRole[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  application_id: string;
  created_at: string;
  role: Role;
  application: Application;
}

// Role types
export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permission_ids?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

// Permission types
export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePermissionRequest {
  resource: string;
  action: string;
  description: string;
}

export interface UpdatePermissionRequest {
  resource?: string;
  action?: string;
  description?: string;
}

// Application types
export interface Application {
  id: string;
  name: string;
  description: string;
  api_key: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationRequest {
  name: string;
  description: string;
  is_active?: boolean;
}

export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface RegenerateAPIKeyResponse {
  api_key: string;
}

// Audit Log types
export interface AuditLog {
  id: string;
  user_id: string;
  application_id: string;
  action: string;
  resource: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user: User;
  application: Application;
}

export interface AuditLogFilters {
  user_id?: string;
  application_id?: string;
  action?: string;
  resource?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AuditStats {
  total_actions: number;
  unique_users: number;
  actions_by_type: Record<string, number>;
  actions_by_resource: Record<string, number>;
  daily_activity: Array<{
    date: string;
    count: number;
  }>;
}

export interface AuditOptions {
  actions: string[];
  resources: string[];
  users: Array<{
    id: string;
    email: string;
    full_name: string;
  }>;
  applications: Array<{
    id: string;
    name: string;
  }>;
}

// Token types
export interface Token {
  id: string;
  user_id: string;
  application_id: string;
  token_type: 'access' | 'refresh';
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  updated_at: string;
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Health check
export interface HealthResponse {
  service: string;
  status: string;
  version: string;
  database?: string;
  cache?: string;
}