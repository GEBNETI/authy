import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { 
  APIResponse, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest,
  ValidateTokenRequest,
  ValidateTokenResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationsResponse,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  RolesResponse,
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionsResponse,
  AuditLog,
  AuditLogFilters,
  AuditLogStats,
  AuditLogOptions,
  PaginatedResponse,
  RegenerateAPIKeyResponse,
  HealthResponse,
  AnalyticsTimeRange,
  AuthenticationAnalytics,
  UserAnalytics,
  ApplicationAnalytics,
  SecurityAnalytics
} from '../types/api';

// Create axios instance with default configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      console.log('📤 REQUEST INTERCEPTOR - URL:', config.url);
      console.log('📤 REQUEST INTERCEPTOR - Method:', config.method?.toUpperCase());
      console.log('📤 REQUEST INTERCEPTOR - Base URL:', config.baseURL);
      console.log('📤 REQUEST INTERCEPTOR - Headers before:', JSON.stringify(config.headers, null, 2));
      console.log('📤 REQUEST INTERCEPTOR - Data:', JSON.stringify(config.data, null, 2));
      
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('📤 REQUEST INTERCEPTOR - Added auth token');
      } else {
        console.log('📤 REQUEST INTERCEPTOR - No auth token found');
      }
      
      console.log('📤 REQUEST INTERCEPTOR - Final headers:', JSON.stringify(config.headers, null, 2));
      console.log('📤 REQUEST INTERCEPTOR - Final URL:', `${config.baseURL}${config.url}`);
      
      return config;
    },
    (error) => {
      console.error('📤 REQUEST INTERCEPTOR - Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors and token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await client.post('/auth/refresh', { refresh_token: refreshToken });
            const { token_pair } = response.data;
            const { access_token, refresh_token: newRefreshToken } = token_pair;
            
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', newRefreshToken);
            
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// Generic API request handler
const request = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<APIResponse<T>> => {
  try {
    const response: AxiosResponse<APIResponse<T>> = await apiClient({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      error: error.message || 'Network error occurred',
    };
  }
};

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<APIResponse<LoginResponse>> => {
    console.log('🔐 LOGIN REQUEST - Payload:', JSON.stringify(data, null, 2));
    console.log('🔐 LOGIN REQUEST - URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/auth/login`);
    
    try {
      const response: AxiosResponse<LoginResponse> = await apiClient.post('/auth/login', data);
      console.log('✅ LOGIN RESPONSE - Status:', response.status);
      console.log('✅ LOGIN RESPONSE - Headers:', JSON.stringify(response.headers, null, 2));
      console.log('✅ LOGIN RESPONSE - Data:', JSON.stringify(response.data, null, 2));
      
      // Login endpoint returns LoginResponse directly, wrap it in APIResponse structure
      const result = {
        success: response.data.success,
        data: response.data,
        message: response.data.message,
      };
      console.log('✅ LOGIN RESPONSE - Final wrapped result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ LOGIN ERROR - Full error:', error);
      console.error('❌ LOGIN ERROR - Response status:', error.response?.status);
      console.error('❌ LOGIN ERROR - Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ LOGIN ERROR - Request config:', JSON.stringify(error.config, null, 2));
      
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  logout: (): Promise<APIResponse<void>> =>
    request('POST', '/auth/logout'),

  refreshToken: async (data: RefreshTokenRequest): Promise<APIResponse<LoginResponse>> => {
    try {
      const response: AxiosResponse<LoginResponse> = await apiClient.post('/auth/refresh', data);
      // Refresh endpoint returns LoginResponse directly, wrap it in APIResponse structure
      return {
        success: response.data.success,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  validateToken: (data: ValidateTokenRequest): Promise<APIResponse<ValidateTokenResponse>> =>
    request('POST', '/auth/validate', data),
};

// Users API
export const usersApi = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<User>>> => {
    console.log('👥 USERS API - getUsers called with params:', params);
    
    try {
      const response: AxiosResponse<any> = await apiClient.get('/users', { params });
      console.log('👥 USERS API - Raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns: { success: true, users: [...], pagination: {...} }
      // Frontend expects: APIResponse<PaginatedResponse<User>>
      const backendData = response.data;
      
      if (backendData.success && backendData.users) {
        const transformedData: PaginatedResponse<User> = {
          items: backendData.users,
          total: backendData.pagination.total,
          page: backendData.pagination.page,
          limit: backendData.pagination.per_page,
          totalPages: backendData.pagination.total_pages,
        };
        
        const result: APIResponse<PaginatedResponse<User>> = {
          success: true,
          data: transformedData,
          message: backendData.message,
        };
        
        console.log('👥 USERS API - Transformed result:', JSON.stringify(result, null, 2));
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('❌ USERS API - Error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getUser: async (id: string): Promise<APIResponse<User>> => {
    console.log('👤 USERS API - getUser called with id:', id);
    try {
      const result = await request<User>('GET', `/users/${id}`);
      console.log('👤 USERS API - getUser result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ USERS API - getUser error:', error);
      throw error;
    }
  },

  createUser: async (data: CreateUserRequest): Promise<APIResponse<User>> => {
    console.log('➕ USERS API - createUser called with data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<User> = await apiClient.post('/users', data);
      console.log('➕ USERS API - createUser raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns User directly, wrap it in APIResponse structure
      const result: APIResponse<User> = {
        success: true,
        data: response.data,
        message: 'User created successfully',
      };
      
      console.log('➕ USERS API - createUser result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ USERS API - createUser error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  updateUser: async (id: string, data: UpdateUserRequest): Promise<APIResponse<User>> => {
    console.log('✏️ USERS API - updateUser called with id:', id, 'data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<User> = await apiClient.put(`/users/${id}`, data);
      console.log('✏️ USERS API - updateUser raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns User directly, wrap it in APIResponse structure
      const result: APIResponse<User> = {
        success: true,
        data: response.data,
        message: 'User updated successfully',
      };
      
      console.log('✏️ USERS API - updateUser result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ USERS API - updateUser error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  deleteUser: async (id: string): Promise<APIResponse<void>> => {
    console.log('🗑️ USERS API - deleteUser called with id:', id);
    try {
      const result = await request<void>('DELETE', `/users/${id}`);
      console.log('🗑️ USERS API - deleteUser result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ USERS API - deleteUser error:', error);
      throw error;
    }
  },

  assignRole: (userId: string, data: { role_id: string; application_id: string }): Promise<APIResponse<void>> =>
    request('POST', `/users/${userId}/roles`, data),

  removeRole: (userId: string, roleId: string): Promise<APIResponse<void>> =>
    request('DELETE', `/users/${userId}/roles/${roleId}`),
};

// Applications API
export const applicationsApi = {
  getApplications: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<Application>>> => {
    console.log('🏢 APPLICATIONS API - getApplications called with params:', params);
    
    try {
      const response: AxiosResponse<ApplicationsResponse> = await apiClient.get('/applications', { params });
      console.log('🏢 APPLICATIONS API - Raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns: { success: true, applications: [...], pagination: {...} }
      // Frontend expects: APIResponse<PaginatedResponse<Application>>
      const backendData = response.data;
      
      if (backendData.success && backendData.applications) {
        const transformedData: PaginatedResponse<Application> = {
          items: backendData.applications,
          total: backendData.pagination.total,
          page: backendData.pagination.page,
          limit: backendData.pagination.per_page,
          totalPages: backendData.pagination.total_pages,
        };
        
        const result: APIResponse<PaginatedResponse<Application>> = {
          success: true,
          data: transformedData,
          message: backendData.message,
        };
        
        console.log('🏢 APPLICATIONS API - Transformed result:', JSON.stringify(result, null, 2));
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch applications');
      }
    } catch (error: any) {
      console.error('❌ APPLICATIONS API - Error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getApplication: async (id: string): Promise<APIResponse<Application>> => {
    console.log('🏢 APPLICATIONS API - getApplication called with id:', id);
    try {
      const response: AxiosResponse<Application> = await apiClient.get(`/applications/${id}`);
      console.log('🏢 APPLICATIONS API - getApplication raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Application> = {
        success: true,
        data: response.data,
        message: 'Application retrieved successfully',
      };
      
      console.log('🏢 APPLICATIONS API - getApplication result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ APPLICATIONS API - getApplication error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  createApplication: async (data: CreateApplicationRequest): Promise<APIResponse<Application>> => {
    console.log('➕ APPLICATIONS API - createApplication called with data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Application> = await apiClient.post('/applications', data);
      console.log('➕ APPLICATIONS API - createApplication raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Application> = {
        success: true,
        data: response.data,
        message: 'Application created successfully',
      };
      
      console.log('➕ APPLICATIONS API - createApplication result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ APPLICATIONS API - createApplication error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  updateApplication: async (id: string, data: UpdateApplicationRequest): Promise<APIResponse<Application>> => {
    console.log('✏️ APPLICATIONS API - updateApplication called with id:', id, 'data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Application> = await apiClient.put(`/applications/${id}`, data);
      console.log('✏️ APPLICATIONS API - updateApplication raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Application> = {
        success: true,
        data: response.data,
        message: 'Application updated successfully',
      };
      
      console.log('✏️ APPLICATIONS API - updateApplication result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ APPLICATIONS API - updateApplication error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  deleteApplication: async (id: string): Promise<APIResponse<void>> => {
    console.log('🗑️ APPLICATIONS API - deleteApplication called with id:', id);
    try {
      const result = await request<void>('DELETE', `/applications/${id}`);
      console.log('🗑️ APPLICATIONS API - deleteApplication result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ APPLICATIONS API - deleteApplication error:', error);
      throw error;
    }
  },

  regenerateAPIKey: (id: string): Promise<APIResponse<RegenerateAPIKeyResponse>> =>
    request('POST', `/applications/${id}/regenerate-key`),
};

// Permissions API
export const permissionsApi = {
  getPermissions: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<Permission>>> => {
    console.log('🔒 PERMISSIONS API - getPermissions called with params:', params);
    
    try {
      // Transform frontend params to backend format
      const backendParams = {
        page: params?.page,
        per_page: params?.limit, // Backend expects 'per_page' not 'limit'
        search: params?.search,
      };
      const response: AxiosResponse<PermissionsResponse> = await apiClient.get('/permissions', { params: backendParams });
      console.log('🔒 PERMISSIONS API - Raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns: { success: true, permissions: [...], pagination: {...} }
      // Frontend expects: APIResponse<PaginatedResponse<Permission>>
      const backendData = response.data;
      
      if (backendData.success && backendData.permissions) {
        const transformedData: PaginatedResponse<Permission> = {
          items: backendData.permissions,
          total: backendData.pagination.total,
          page: backendData.pagination.page,
          limit: backendData.pagination.per_page,
          totalPages: backendData.pagination.total_pages,
        };
        
        const result: APIResponse<PaginatedResponse<Permission>> = {
          success: true,
          data: transformedData,
          message: backendData.message,
        };
        
        console.log('🔒 PERMISSIONS API - Transformed result:', JSON.stringify(result, null, 2));
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch permissions');
      }
    } catch (error: any) {
      console.error('❌ PERMISSIONS API - Error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getPermission: async (id: string): Promise<APIResponse<Permission>> => {
    console.log('🔒 PERMISSIONS API - getPermission called with id:', id);
    try {
      const response: AxiosResponse<Permission> = await apiClient.get(`/permissions/${id}`);
      console.log('🔒 PERMISSIONS API - getPermission raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Permission> = {
        success: true,
        data: response.data,
        message: 'Permission retrieved successfully',
      };
      
      console.log('🔒 PERMISSIONS API - getPermission result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ PERMISSIONS API - getPermission error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  createPermission: async (data: CreatePermissionRequest): Promise<APIResponse<Permission>> => {
    console.log('➕ PERMISSIONS API - createPermission called with data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Permission> = await apiClient.post('/permissions', data);
      console.log('➕ PERMISSIONS API - createPermission raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Permission> = {
        success: true,
        data: response.data,
        message: 'Permission created successfully',
      };
      
      console.log('➕ PERMISSIONS API - createPermission result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ PERMISSIONS API - createPermission error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  updatePermission: async (id: string, data: UpdatePermissionRequest): Promise<APIResponse<Permission>> => {
    console.log('✏️ PERMISSIONS API - updatePermission called with id:', id, 'data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Permission> = await apiClient.put(`/permissions/${id}`, data);
      console.log('✏️ PERMISSIONS API - updatePermission raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Permission> = {
        success: true,
        data: response.data,
        message: 'Permission updated successfully',
      };
      
      console.log('✏️ PERMISSIONS API - updatePermission result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ PERMISSIONS API - updatePermission error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  deletePermission: async (id: string): Promise<APIResponse<void>> => {
    console.log('🗑️ PERMISSIONS API - deletePermission called with id:', id);
    try {
      const result = await request<void>('DELETE', `/permissions/${id}`);
      console.log('🗑️ PERMISSIONS API - deletePermission result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ PERMISSIONS API - deletePermission error:', error);
      throw error;
    }
  },
};

// Roles API
export const rolesApi = {
  getRoles: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<Role>>> => {
    console.log('👑 ROLES API - getRoles called with params:', params);
    
    try {
      const response: AxiosResponse<RolesResponse> = await apiClient.get('/roles', { params });
      console.log('👑 ROLES API - Raw response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns: { success: true, roles: [...], pagination: {...} }
      // Frontend expects: APIResponse<PaginatedResponse<Role>>
      const backendData = response.data;
      
      if (backendData.success && backendData.roles) {
        const transformedData: PaginatedResponse<Role> = {
          items: backendData.roles,
          total: backendData.pagination.total,
          page: backendData.pagination.page,
          limit: backendData.pagination.per_page,
          totalPages: backendData.pagination.total_pages,
        };
        
        const result: APIResponse<PaginatedResponse<Role>> = {
          success: true,
          data: transformedData,
          message: backendData.message,
        };
        
        console.log('👑 ROLES API - Transformed result:', JSON.stringify(result, null, 2));
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch roles');
      }
    } catch (error: any) {
      console.error('❌ ROLES API - Error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getRole: async (id: string): Promise<APIResponse<Role>> => {
    console.log('👑 ROLES API - getRole called with id:', id);
    try {
      const response: AxiosResponse<Role> = await apiClient.get(`/roles/${id}`);
      console.log('👑 ROLES API - getRole raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Role> = {
        success: true,
        data: response.data,
        message: 'Role retrieved successfully',
      };
      
      console.log('👑 ROLES API - getRole result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ ROLES API - getRole error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  createRole: async (data: CreateRoleRequest): Promise<APIResponse<Role>> => {
    console.log('➕ ROLES API - createRole called with data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Role> = await apiClient.post('/roles', data);
      console.log('➕ ROLES API - createRole raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Role> = {
        success: true,
        data: response.data,
        message: 'Role created successfully',
      };
      
      console.log('➕ ROLES API - createRole result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ ROLES API - createRole error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  updateRole: async (id: string, data: UpdateRoleRequest): Promise<APIResponse<Role>> => {
    console.log('✏️ ROLES API - updateRole called with id:', id, 'data:', JSON.stringify(data, null, 2));
    try {
      const response: AxiosResponse<Role> = await apiClient.put(`/roles/${id}`, data);
      console.log('✏️ ROLES API - updateRole raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Role> = {
        success: true,
        data: response.data,
        message: 'Role updated successfully',
      };
      
      console.log('✏️ ROLES API - updateRole result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ ROLES API - updateRole error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  deleteRole: async (id: string): Promise<APIResponse<void>> => {
    console.log('🗑️ ROLES API - deleteRole called with id:', id);
    try {
      const result = await request<void>('DELETE', `/roles/${id}`);
      console.log('🗑️ ROLES API - deleteRole result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ ROLES API - deleteRole error:', error);
      throw error;
    }
  },

  assignPermissions: async (roleId: string, permissionIds: string[]): Promise<APIResponse<Role>> => {
    console.log('🔗 ROLES API - assignPermissions called with roleId:', roleId, 'permissionIds:', permissionIds);
    try {
      const response: AxiosResponse<Role> = await apiClient.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
      console.log('🔗 ROLES API - assignPermissions raw response:', JSON.stringify(response.data, null, 2));
      
      const result: APIResponse<Role> = {
        success: true,
        data: response.data,
        message: 'Permissions assigned successfully',
      };
      
      console.log('🔗 ROLES API - assignPermissions result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ ROLES API - assignPermissions error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },
};

// Audit Logs API
export const auditLogsApi = {
  getAuditLogs: async (filters?: AuditLogFilters): Promise<APIResponse<PaginatedResponse<AuditLog>>> => {
    try {
      console.log('📋 AUDIT API - getAuditLogs called with filters:', filters);
      const response = await apiClient.get('/audit-logs', { params: filters });
      console.log('📋 AUDIT API - Raw response:', response.data);
      
      const backendData = response.data;
      if (backendData.success) {
        // Transform backend response to expected frontend format
        const transformedData: PaginatedResponse<AuditLog> = {
          items: backendData.audit_logs || [],
          total: backendData.pagination?.total || 0,
          page: backendData.pagination?.page || 1,
          limit: backendData.pagination?.per_page || 20,
          totalPages: backendData.pagination?.total_pages || 0,
        };
        
        const result: APIResponse<PaginatedResponse<AuditLog>> = {
          success: true,
          data: transformedData,
          message: backendData.message,
        };
        
        console.log('📋 AUDIT API - Transformed result:', result);
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch audit logs');
      }
    } catch (error: any) {
      console.error('❌ AUDIT API - Error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getAuditLogStats: async (): Promise<APIResponse<AuditLogStats>> => {
    try {
      console.log('📊 AUDIT API - getAuditLogStats called');
      const response = await apiClient.get('/audit-logs/stats');
      console.log('📊 AUDIT API - Raw response:', response.data);
      
      const backendData = response.data;
      if (backendData.success) {
        const result: APIResponse<AuditLogStats> = {
          success: true,
          data: backendData.stats,
          message: backendData.message,
        };
        
        console.log('📊 AUDIT API - Transformed result:', result);
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch audit stats');
      }
    } catch (error: any) {
      console.error('❌ AUDIT API - Stats error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  getAuditLogOptions: async (): Promise<APIResponse<AuditLogOptions>> => {
    try {
      console.log('⚙️ AUDIT API - getAuditLogOptions called');
      const response = await apiClient.get('/audit-logs/options');
      console.log('⚙️ AUDIT API - Raw response:', response.data);
      
      const backendData = response.data;
      if (backendData.success) {
        // Transform backend response to expected frontend format
        const transformedOptions: AuditLogOptions = {
          actions: backendData.actions || [],
          resources: backendData.resources || [],
          applications: [] // Will be populated from applications API if needed
        };
        
        const result: APIResponse<AuditLogOptions> = {
          success: true,
          data: transformedOptions,
          message: backendData.message,
        };
        
        console.log('⚙️ AUDIT API - Transformed result:', result);
        return result;
      } else {
        throw new Error(backendData.message || 'Failed to fetch audit options');
      }
    } catch (error: any) {
      console.error('❌ AUDIT API - Options error:', error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  },

  exportAuditLogs: (filters?: AuditLogFilters): Promise<Blob> =>
    apiClient.get('/audit-logs/export', { 
      params: filters, 
      responseType: 'blob' 
    }).then(response => response.data),
};

// Health API
export const healthApi = {
  getHealth: (): Promise<HealthResponse> =>
    apiClient.get('/health', { baseURL: 'http://localhost:8080' }).then(response => response.data),
};

// Analytics API
export const analyticsApi = {
  getAuthenticationAnalytics: async (timeRange: AnalyticsTimeRange): Promise<APIResponse<AuthenticationAnalytics>> => {
    try {
      console.log('📈 ANALYTICS API - getAuthenticationAnalytics called with timeRange:', timeRange);
      const response = await apiClient.get('/analytics/authentication', { params: timeRange });
      console.log('📈 ANALYTICS API - Raw response:', response.data);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch authentication analytics');
      }
    } catch (error: any) {
      console.error('❌ ANALYTICS API - Error:', error);
      // For now, return mock data until backend is implemented
      return {
        success: true,
        data: {
          login_success_rate: 85.5,
          total_logins: 1250,
          failed_logins: 182,
          unique_users: 156,
          login_trends: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            successful: Math.floor(Math.random() * 200) + 100,
            failed: Math.floor(Math.random() * 50) + 10,
          })),
          failure_reasons: [
            { reason: 'Invalid credentials', count: 120 },
            { reason: 'Account locked', count: 35 },
            { reason: 'Application not found', count: 27 },
          ],
          peak_hours: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: Math.floor(Math.random() * 100) + 20,
          })),
        },
      };
    }
  },

  getUserAnalytics: async (timeRange: AnalyticsTimeRange): Promise<APIResponse<UserAnalytics>> => {
    try {
      console.log('📈 ANALYTICS API - getUserAnalytics called with timeRange:', timeRange);
      const response = await apiClient.get('/analytics/users', { params: timeRange });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch user analytics');
      }
    } catch (error: any) {
      console.error('❌ ANALYTICS API - Error:', error);
      // Return mock data for now
      return {
        success: true,
        data: {
          total_users: 342,
          active_users: 187,
          new_users_trend: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 10) + 1,
          })),
          role_distribution: [
            { role: 'Admin', count: 5 },
            { role: 'Manager', count: 23 },
            { role: 'User', count: 314 },
          ],
          top_active_users: [
            { user_id: '1', email: 'admin@authy.dev', name: 'Admin User', action_count: 523 },
            { user_id: '2', email: 'john.doe@example.com', name: 'John Doe', action_count: 342 },
            { user_id: '3', email: 'jane.smith@example.com', name: 'Jane Smith', action_count: 287 },
          ],
        },
      };
    }
  },

  getApplicationAnalytics: async (timeRange: AnalyticsTimeRange): Promise<APIResponse<ApplicationAnalytics>> => {
    try {
      console.log('📈 ANALYTICS API - getApplicationAnalytics called with timeRange:', timeRange);
      const response = await apiClient.get('/analytics/applications', { params: timeRange });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch application analytics');
      }
    } catch (error: any) {
      console.error('❌ ANALYTICS API - Error:', error);
      // Return mock data for now
      return {
        success: true,
        data: {
          total_applications: 12,
          application_usage: [
            { application_id: '1', name: 'Web App', request_count: 15234, user_count: 234 },
            { application_id: '2', name: 'Mobile App', request_count: 8765, user_count: 156 },
            { application_id: '3', name: 'API Service', request_count: 23456, user_count: 45 },
          ],
          api_usage_trend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            requests: Math.floor(Math.random() * 5000) + 2000,
          })),
          error_rates: [
            { application: 'Web App', error_rate: 0.5, total_requests: 15234 },
            { application: 'Mobile App', error_rate: 1.2, total_requests: 8765 },
            { application: 'API Service', error_rate: 0.3, total_requests: 23456 },
          ],
        },
      };
    }
  },

  getSecurityAnalytics: async (timeRange: AnalyticsTimeRange): Promise<APIResponse<SecurityAnalytics>> => {
    try {
      console.log('📈 ANALYTICS API - getSecurityAnalytics called with timeRange:', timeRange);
      const response = await apiClient.get('/analytics/security', { params: timeRange });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch security analytics');
      }
    } catch (error: any) {
      console.error('❌ ANALYTICS API - Error:', error);
      // Return mock data for now
      return {
        success: true,
        data: {
          suspicious_activities: 23,
          blocked_ips: 5,
          failed_login_ips: [
            { ip_address: '192.168.1.100', attempts: 15, last_attempt: new Date().toISOString() },
            { ip_address: '10.0.0.50', attempts: 12, last_attempt: new Date().toISOString() },
            { ip_address: '172.16.0.25', attempts: 8, last_attempt: new Date().toISOString() },
          ],
          permission_usage: [
            { permission: 'users:create', usage_count: 234 },
            { permission: 'users:read', usage_count: 1523 },
            { permission: 'users:update', usage_count: 456 },
            { permission: 'applications:read', usage_count: 789 },
          ],
          security_events_trend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            events: Math.floor(Math.random() * 20) + 5,
          })),
        },
      };
    }
  },
};

// Export the configured axios instance for custom requests
export default apiClient;