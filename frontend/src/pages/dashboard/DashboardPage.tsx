import React from 'react';
import { Users, Building, Shield, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardTitle } from '../../components/ui';
import { useAuth } from '../../context';

const DashboardPage: React.FC = () => {
  const { state } = useAuth();

  // Mock data for demo
  const stats = [
    {
      name: 'Total Users',
      value: '1,234',
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      name: 'Applications',
      value: '23',
      change: '+2',
      changeType: 'positive' as const,
      icon: Building,
    },
    {
      name: 'Permissions',
      value: '156',
      change: '+8%',
      changeType: 'positive' as const,
      icon: Shield,
    },
    {
      name: 'Active Sessions',
      value: '847',
      change: '-3%',
      changeType: 'negative' as const,
      icon: Activity,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      user: 'John Doe',
      action: 'User logged in',
      timestamp: '2 minutes ago',
      type: 'login',
    },
    {
      id: 2,
      user: 'Jane Smith',
      action: 'Created new application',
      timestamp: '15 minutes ago',
      type: 'create',
    },
    {
      id: 3,
      user: 'Admin',
      action: 'Updated user permissions',
      timestamp: '1 hour ago',
      type: 'update',
    },
    {
      id: 4,
      user: 'Bob Johnson',
      action: 'Failed login attempt',
      timestamp: '2 hours ago',
      type: 'error',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <Activity className="w-4 h-4 text-success" />;
      case 'create':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case 'update':
        return <Shield className="w-4 h-4 text-warning" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return <Activity className="w-4 h-4 text-base-content/70" />;
    }
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
                  <p className={`text-sm flex items-center ${
                    stat.changeType === 'positive' ? 'text-success' : 'text-error'
                  }`}>
                    {stat.change}
                    <span className="ml-1">from last month</span>
                  </p>
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
            <div className="flex items-center space-x-3 p-3 bg-success/10 rounded-lg">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-base-content/70">Connected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-success/10 rounded-lg">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Cache</p>
                <p className="text-xs text-base-content/70">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-success/10 rounded-lg">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <div>
                <p className="text-sm font-medium">API</p>
                <p className="text-xs text-base-content/70">Healthy</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default DashboardPage;