import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Notification, NotificationState } from '../types';
import { utils } from '../utils';

// Notification actions
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

// Initial state
const initialState: { notifications: Notification[] } = {
  notifications: [],
};

// Notification reducer
const notificationReducer = (
  state: { notifications: Notification[] },
  action: NotificationAction
): { notifications: Notification[] } => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          action.payload,
        ],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    default:
      return state;
  }
};

// Create context
const NotificationContext = createContext<NotificationState | undefined>(undefined);

// Notification provider component
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Add notification function
  const addNotification = (notification: Omit<Notification, 'id'>): void => {
    const notificationId = utils.generateId();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { ...notification, id: notificationId } });

    // Auto-remove notification after duration
    const duration = notification.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
      }, duration);
    }
  };

  // Remove notification function
  const removeNotification = (id: string): void => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  // Clear all notifications function
  const clearNotifications = (): void => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  // Context value
  const value: NotificationState = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification container component
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Notification item component
interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const getAlertClass = (type: string): string => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-info';
    }
  };

  const getIcon = (type: string): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`alert ${getAlertClass(notification.type)} shadow-lg max-w-sm`}>
      <div>
        <span className="text-lg">{getIcon(notification.type)}</span>
        <div>
          <h3 className="font-bold">{notification.title}</h3>
          {notification.message && (
            <div className="text-xs">{notification.message}</div>
          )}
        </div>
      </div>
      <div className="flex-none">
        {notification.action && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </button>
        )}
        <button
          className="btn btn-sm btn-ghost"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Custom hook to use notification context
export const useNotification = (): NotificationState => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Helper functions for common notification types
export const notification = {
  success: (title: string, message?: string, duration?: number) => {
    const { addNotification } = useNotification();
    addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  },

  error: (title: string, message?: string, duration?: number) => {
    const { addNotification } = useNotification();
    addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 0, // Error notifications don't auto-dismiss
    });
  },

  warning: (title: string, message?: string, duration?: number) => {
    const { addNotification } = useNotification();
    addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  },

  info: (title: string, message?: string, duration?: number) => {
    const { addNotification } = useNotification();
    addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  },
};

export default NotificationContext;