import React, { useState, useEffect } from 'react';
import { Users, Building, Shield, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardTitle } from '../../components/ui';
import { useAuth } from '../../context';
import { useUsers, useApplications, usePermissions, useAuditLogs } from '../../hooks';
import { healthApi } from '../../services/api';
import { formatUtils } from '../../utils';
import type { HealthResponse } from '../../types';

const DashboardPage: React.FC = () => {
  const { state } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);

  // Fetch real data from APIs (we only need pagination data for counts)
  const { pagination: usersPagination } = useUsers({ limit: 1 });
  const { pagination: appsPagination } = useApplications({ limit: 1 });
  const { pagination: permissionsPagination } = usePermissions({ limit: 1 });
  const { auditLogs = [] } = useAuditLogs({ limit: 10, autoFetch: true }); // Recent activities

  // Fetch health status
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await healthApi.getHealth();
        setHealthStatus(health);
      } catch (error) {
        console.error('Failed to fetch health status:', error);
      }
    };
    fetchHealth();
  }, []);

  // Create stats from real data
  const stats = [
    {
      name: 'Total Users',
      value: usersPagination?.total?.toLocaleString() || '0',
      icon: Users,
    },
    {
      name: 'Applications',
      value: appsPagination?.total?.toString() || '0',
      icon: Building,
    },
    {
      name: 'Permissions',
      value: permissionsPagination?.total?.toString() || '0',
      icon: Shield,
    },
    {
      name: 'Recent Logs',
      value: auditLogs.length.toString(),
      icon: Activity,
    },
  ];

  // Helper functions for audit log conversion
  const getActionDescription = (action: string, resource: string): string => {
    const actionMap: Record<string, string> = {
      'login': 'Logged in successfully',
      'login_failed': 'Failed login attempt',
      'logout': 'Logged out',
      'user_create': 'Created a new user',
      'user_update': 'Updated user information',
      'user_delete': 'Deleted a user',
      'application_create': 'Created new application',
      'application_update': 'Updated application',
      'application_delete': 'Deleted application',
      'role_create': 'Created new role',
      'role_update': 'Updated role',
      'role_delete': 'Deleted role',
      'role_assign': 'Assigned role to user',
      'role_remove': 'Removed role from user',
    };
    
    return actionMap[action] || `${action.replace('_', ' ')} on ${resource}`;
  };

  const getActivityType = (action: string): string => {
    if (action.includes('login')) return 'login';
    if (action.includes('create')) return 'create';
    if (action.includes('update') || action.includes('assign') || action.includes('remove')) return 'update';
    if (action.includes('delete')) return 'delete';
    if (action.includes('failed')) return 'error';
    return 'activity';
  };

  // Convert audit logs to recent activities
  const recentActivities = auditLogs.slice(0, 6).map((log, index) => ({
    id: index + 1,
    user: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
    action: getActionDescription(log.action, log.resource),
    timestamp: formatUtils.formatRelativeTime(log.created_at),
    type: getActivityType(log.action),
  }));

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <Activity className="w-4 h-4 text-success" />;
      case 'create':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case 'update':
        return <Shield className="w-4 h-4 text-warning" />;
      case 'delete':
        return <AlertCircle className="w-4 h-4 text-error" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return <Activity className="w-4 h-4 text-base-content/70" />;
    }
  };

  // System status based on health check
  const getSystemStatus = () => {
    if (!healthStatus) {
      return [
        { name: 'Database', status: 'unknown', color: 'bg-warning' },
        { name: 'Cache', status: 'unknown', color: 'bg-warning' },
        { name: 'API', status: 'unknown', color: 'bg-warning' },
      ];
    }

    return [
      { 
        name: 'Database', 
        status: healthStatus.database || 'Connected', 
        color: healthStatus.status === 'healthy' ? 'bg-success' : 'bg-error' 
      },
      { 
        name: 'Cache', 
        status: healthStatus.cache || 'Operational', 
        color: healthStatus.status === 'healthy' ? 'bg-success' : 'bg-error' 
      },
      { 
        name: 'API', 
        status: healthStatus.status === 'healthy' ? 'Healthy' : 'Issues', 
        color: healthStatus.status === 'healthy' ? 'bg-success' : 'bg-error' 
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
        <p className="text-base-content/70 mt-1">
          Welcome back, {state.user?.first_name}! Here's what's happening with your authentication service.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} shadow="md">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70">{stat.name}</p>
                  <p className="text-2xl font-bold text-base-content">{stat.value}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card shadow="md">
            <CardBody>
              <CardTitle>Recent Activity</CardTitle>
              <div className="mt-4 space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-base-200/50 rounded-lg">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-base-content">
                        {activity.user}
                      </p>
                      <p className="text-sm text-base-content/70">
                        {activity.action}
                      </p>
                    </div>
                    <div className="text-xs text-base-content/50">
                      {activity.timestamp}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <a href="/audit" className="text-sm text-primary hover:text-primary-focus">
                  View all activities →
                </a>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card shadow="md">
            <CardBody>
              <CardTitle>Quick Actions</CardTitle>
              <div className="mt-4 space-y-3">
                <a href="/users" className="block p-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Manage Users</p>
                      <p className="text-xs text-base-content/70">Add, edit, or remove users</p>
                    </div>
                  </div>
                </a>
                <a href="/applications" className="block p-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Applications</p>
                      <p className="text-xs text-base-content/70">Manage registered apps</p>
                    </div>
                  </div>
                </a>
                <a href="/permissions" className="block p-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Permissions</p>
                      <p className="text-xs text-base-content/70">Configure access control</p>
                    </div>
                  </div>
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* System Status */}
      <Card shadow="md">
        <CardBody>
          <CardTitle>System Status</CardTitle>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {getSystemStatus().map((system) => (
              <div key={system.name} className={`flex items-center space-x-3 p-3 rounded-lg ${
                system.color === 'bg-success' ? 'bg-success/10' : 
                system.color === 'bg-error' ? 'bg-error/10' : 
                'bg-warning/10'
              }`}>
                <div className={`w-3 h-3 rounded-full ${system.color}`}></div>
                <div>
                  <p className="text-sm font-medium">{system.name}</p>
                  <p className="text-xs text-base-content/70">{system.status}</p>
                </div>
              </div>
            ))}
          </div>
          {healthStatus && (
            <div className="mt-4 text-center">
              <p className="text-xs text-base-content/50">
                Service: {healthStatus.service} v{healthStatus.version}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default DashboardPage;