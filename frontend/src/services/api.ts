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
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  AuditLog,
  AuditLogFilters,
  AuditStats,
  AuditOptions,
  PaginatedResponse,
  RegenerateAPIKeyResponse,
  HealthResponse
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
      const result = await request('GET', `/users/${id}`);
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
      const result = await request('DELETE', `/users/${id}`);
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
  getApplications: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<Application>>> =>
    request('GET', '/applications', undefined, { params }),

  getApplication: (id: string): Promise<APIResponse<Application>> =>
    request('GET', `/applications/${id}`),

  createApplication: (data: CreateApplicationRequest): Promise<APIResponse<Application>> =>
    request('POST', '/applications', data),

  updateApplication: (id: string, data: UpdateApplicationRequest): Promise<APIResponse<Application>> =>
    request('PUT', `/applications/${id}`, data),

  deleteApplication: (id: string): Promise<APIResponse<void>> =>
    request('DELETE', `/applications/${id}`),

  regenerateAPIKey: (id: string): Promise<APIResponse<RegenerateAPIKeyResponse>> =>
    request('POST', `/applications/${id}/regenerate-key`),
};

// Permissions API
export const permissionsApi = {
  getPermissions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<APIResponse<PaginatedResponse<Permission>>> =>
    request('GET', '/permissions', undefined, { params }),

  getPermission: (id: string): Promise<APIResponse<Permission>> =>
    request('GET', `/permissions/${id}`),

  createPermission: (data: CreatePermissionRequest): Promise<APIResponse<Permission>> =>
    request('POST', '/permissions', data),

  updatePermission: (id: string, data: UpdatePermissionRequest): Promise<APIResponse<Permission>> =>
    request('PUT', `/permissions/${id}`, data),

  deletePermission: (id: string): Promise<APIResponse<void>> =>
    request('DELETE', `/permissions/${id}`),
};

// Audit Logs API
export const auditApi = {
  getAuditLogs: (filters?: AuditLogFilters): Promise<APIResponse<PaginatedResponse<AuditLog>>> =>
    request('GET', '/audit-logs', undefined, { params: filters }),

  getAuditStats: (filters?: Pick<AuditLogFilters, 'start_date' | 'end_date'>): Promise<APIResponse<AuditStats>> =>
    request('GET', '/audit-logs/stats', undefined, { params: filters }),

  getAuditOptions: (): Promise<APIResponse<AuditOptions>> =>
    request('GET', '/audit-logs/options'),

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

// Export the configured axios instance for custom requests
export default apiClient;