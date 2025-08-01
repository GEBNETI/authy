import React, { useState } from 'react';
import { TrendingUp, Users, Shield, Activity, Clock, AlertTriangle, BarChart3, Calendar } from 'lucide-react';
import { Card, CardBody, CardTitle, Input } from '../../components/ui';
import { useAnalytics } from '../../hooks';
import { formatUtils } from '../../utils';
import type { AnalyticsTimeRange } from '../../types';

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>({
    range: '7d',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  });

  const { authentication, users, applications, security, isLoading, error } = useAnalytics(timeRange);

  const handleTimeRangeChange = (range: '24h' | '7d' | '30d' | '90d') => {
    const now = new Date();
    let start = new Date();
    
    switch (range) {
      case '24h':
        start.setDate(now.getDate() - 1);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
    }
    
    setTimeRange({
      range,
      start_date: start.toISOString(),
      end_date: now.toISOString(),
    });
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-base-content">Error Loading Analytics</h2>
        <p className="text-base-content/70 mt-2">Failed to retrieve analytics data</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="text-base-content/70 mt-4">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Analytics</h1>
          <p className="text-base-content/70 mt-1">Monitor authentication patterns and system usage</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange.range}
            onChange={(e) => handleTimeRangeChange(e.target.value as any)}
            className="select select-bordered w-32"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Authentication Analytics */}
      {authentication && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-base-content">Authentication Overview</h2>
          
          {/* Auth Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Success Rate</p>
                    <p className="text-2xl font-bold text-success">
                      {authentication.login_success_rate.toFixed(1)}%
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-success/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Total Logins</p>
                    <p className="text-2xl font-bold">{authentication.total_logins.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Failed Attempts</p>
                    <p className="text-2xl font-bold text-error">{authentication.failed_logins.toLocaleString()}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-error/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Unique Users</p>
                    <p className="text-2xl font-bold">{authentication.unique_users.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/20" />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Login Trends Chart (placeholder) */}
          <Card shadow="md">
            <CardBody>
              <CardTitle>Login Trends</CardTitle>
              <div className="mt-4 h-64 flex items-center justify-center bg-base-200 rounded-lg">
                <BarChart3 className="w-12 h-12 text-base-content/30" />
                <p className="ml-4 text-base-content/50">Chart visualization would go here</p>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Reasons */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Top Failure Reasons</CardTitle>
                <div className="mt-4 space-y-3">
                  {authentication.failure_reasons.slice(0, 5).map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">{reason.reason}</span>
                      <span className="text-sm font-medium">{reason.count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Peak Hours */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Peak Activity Hours</CardTitle>
                <div className="mt-4 space-y-2">
                  {authentication.peak_hours.slice(0, 5).map((hour, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-base-content/50" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{hour.hour}:00</span>
                          <span className="text-sm font-medium">{hour.count} logins</span>
                        </div>
                        <div className="mt-1 w-full bg-base-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(hour.count / Math.max(...authentication.peak_hours.map(h => h.count))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* User Analytics */}
      {users && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-base-content">User Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Total Users</p>
                    <p className="text-2xl font-bold">{users.total_users.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Active Users</p>
                    <p className="text-2xl font-bold text-success">{users.active_users.toLocaleString()}</p>
                  </div>
                  <Activity className="w-8 h-8 text-success/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Inactive Users</p>
                    <p className="text-2xl font-bold text-warning">
                      {(users.total_users - users.active_users).toLocaleString()}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-warning/20" />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Role Distribution</CardTitle>
                <div className="mt-4 space-y-3">
                  {users.role_distribution.map((role, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">{role.role}</span>
                      <span className="text-sm font-medium">{role.count} users</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Top Active Users */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Most Active Users</CardTitle>
                <div className="mt-4 space-y-3">
                  {users.top_active_users.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-base-content/70">{user.email}</p>
                      </div>
                      <span className="text-sm font-medium">{user.action_count} actions</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Application Analytics */}
      {applications && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-base-content">Application Usage</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Usage */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Top Applications</CardTitle>
                <div className="mt-4 space-y-3">
                  {applications.application_usage.slice(0, 5).map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{app.name}</p>
                        <p className="text-xs text-base-content/70">{app.user_count} users</p>
                      </div>
                      <span className="text-sm font-medium">{app.request_count.toLocaleString()} requests</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Error Rates */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Application Error Rates</CardTitle>
                <div className="mt-4 space-y-3">
                  {applications.error_rates.filter(app => app.error_rate > 0).slice(0, 5).map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">{app.application}</span>
                      <span className={`text-sm font-medium ${
                        app.error_rate > 5 ? 'text-error' : 
                        app.error_rate > 2 ? 'text-warning' : 
                        'text-success'
                      }`}>
                        {app.error_rate.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Security Analytics */}
      {security && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-base-content">Security Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Suspicious Activities</p>
                    <p className="text-2xl font-bold text-warning">{security.suspicious_activities}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-warning/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Blocked IPs</p>
                    <p className="text-2xl font-bold text-error">{security.blocked_ips}</p>
                  </div>
                  <Shield className="w-8 h-8 text-error/20" />
                </div>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/70">Security Events</p>
                    <p className="text-2xl font-bold">
                      {security.security_events_trend.reduce((sum, day) => sum + day.events, 0)}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-primary/20" />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failed Login IPs */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Suspicious IP Addresses</CardTitle>
                <div className="mt-4 space-y-3">
                  {security.failed_login_ips.slice(0, 5).map((ip, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-mono">{ip.ip_address}</p>
                        <p className="text-xs text-base-content/70">
                          Last attempt: {formatUtils.formatRelativeTime(ip.last_attempt)}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-error">{ip.attempts} attempts</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Permission Usage */}
            <Card shadow="md">
              <CardBody>
                <CardTitle>Most Used Permissions</CardTitle>
                <div className="mt-4 space-y-3">
                  {security.permission_usage.slice(0, 5).map((perm, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-base-content/70">{perm.permission}</span>
                      <span className="text-sm font-medium">{perm.usage_count} uses</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;