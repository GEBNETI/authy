import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthState, AuthContextType, User } from '../types';
import { authApi } from '../services/api';
import { tokenManager, userManager, errorUtils } from '../utils';

// Auth actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'REFRESH_TOKEN_FAILURE' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INITIALIZE'; payload: { user: User; accessToken: string; refreshToken: string } };

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
      };

    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        error: null,
      };

    case 'REFRESH_TOKEN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: 'Session expired. Please login again.',
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'INITIALIZE':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const accessToken = tokenManager.getAccessToken();
        const refreshToken = tokenManager.getRefreshToken();
        const user = userManager.getUser();

        if (accessToken && refreshToken && user) {
          // Check if token is expired
          if (tokenManager.isTokenExpired(accessToken)) {
            // Try to refresh token
            try {
              const response = await authApi.refreshToken({ refresh_token: refreshToken });
              
              if (response.success && response.data) {
                const { token_pair } = response.data;
                const { access_token, refresh_token: newRefreshToken } = token_pair;
                
                // Update tokens
                tokenManager.setTokens(access_token, newRefreshToken);
                
                dispatch({
                  type: 'REFRESH_TOKEN_SUCCESS',
                  payload: {
                    accessToken: access_token,
                    refreshToken: newRefreshToken,
                  },
                });
                
                // Initialize with existing user and new tokens
                dispatch({
                  type: 'INITIALIZE',
                  payload: {
                    user,
                    accessToken: access_token,
                    refreshToken: newRefreshToken,
                  },
                });
              } else {
                throw new Error('Token refresh failed');
              }
            } catch (error) {
              // Refresh failed, clear tokens
              tokenManager.clearTokens();
              userManager.removeUser();
              dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
            }
          } else {
            // Token is valid, initialize
            dispatch({
              type: 'INITIALIZE',
              payload: {
                user,
                accessToken,
                refreshToken,
              },
            });
          }
        } else {
          // No valid auth data, set loading to false
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    console.log('🚀 AUTH CONTEXT - Starting login process');
    dispatch({ type: 'LOGIN_START' });

    try {
      console.log('🚀 AUTH CONTEXT - Calling authApi.login with:', {
        email,
        password: '***hidden***',
        application: 'AuthyBackoffice'
      });

      const response = await authApi.login({ 
        email, 
        password,
        application: 'AuthyBackoffice'
      });

      console.log('🚀 AUTH CONTEXT - Received response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('🚀 AUTH CONTEXT - Response is successful, extracting data');
        const { token_pair, user } = response.data;
        const { access_token, refresh_token } = token_pair;

        console.log('🚀 AUTH CONTEXT - Extracted tokens and user:', {
          access_token: access_token ? `${access_token.substring(0, 20)}...` : 'null',
          refresh_token: refresh_token ? `${refresh_token.substring(0, 20)}...` : 'null',
          user: user
        });

        // Store tokens and user
        tokenManager.setTokens(access_token, refresh_token);
        userManager.setUser(user);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
          },
        });
        console.log('✅ AUTH CONTEXT - Login successful!');
      } else {
        console.error('❌ AUTH CONTEXT - Response not successful:', {
          success: response.success,
          data: response.data,
          error: response.error
        });
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT - Login error:', error);
      const errorMessage = errorUtils.getErrorMessage(error);
      console.error('❌ AUTH CONTEXT - Error message:', errorMessage);
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout API
      await authApi.logout();
    } catch (error) {
      // Even if API call fails, we still want to logout locally
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      tokenManager.clearTokens();
      userManager.removeUser();
      
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const currentRefreshToken = tokenManager.getRefreshToken();
      
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken({ refresh_token: currentRefreshToken });

      if (response.success && response.data) {
        const { token_pair } = response.data;
        const { access_token, refresh_token: newRefreshToken } = token_pair;

        // Update tokens
        tokenManager.setTokens(access_token, newRefreshToken);

        dispatch({
          type: 'REFRESH_TOKEN_SUCCESS',
          payload: {
            accessToken: access_token,
            refreshToken: newRefreshToken,
          },
        });
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      // Refresh failed, clear tokens and logout
      tokenManager.clearTokens();
      userManager.removeUser();
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      throw error;
    }
  }, []);

  // Clear error function
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Context value
  const value: AuthContextType = {
    state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected routes
interface WithAuthProps {
  requiredPermission?: {
    resource: string;
    action: string;
  };
}

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: WithAuthProps
) => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { state } = useAuth();

    // Show loading while checking auth
    if (state.loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!state.isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    // Check permissions if required
    if (options?.requiredPermission && state.user) {
      const { resource, action } = options.requiredPermission;
      const hasPermission = state.user.roles?.some(userRole =>
        userRole.role.permissions?.some(permission =>
          permission.resource === resource && permission.action === action
        )
      );

      if (!hasPermission) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-error mb-4">Access Denied</h2>
              <p className="text-base-content/70">
                You don't have permission to access this resource.
              </p>
            </div>
          </div>
        );
      }
    }

    return <Component {...props} />;
  };

  return AuthenticatedComponent;
};

export default AuthContext;