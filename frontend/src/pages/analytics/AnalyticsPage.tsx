import React, { useState } from 'react';
import { TrendingUp, Users, Shield, Activity, Clock, AlertTriangle, BarChart3, Calendar } from 'lucide-react';
import { Card, CardBody, CardTitle, Input } from '../../components/ui';
import { LineChart, BarChart, DonutChart, HeatmapChart } from '../../components/charts';
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

          {/* Login Trends Chart */}
          <Card shadow="md">
            <CardBody>
              <LineChart
                data={authentication.login_trends.map(trend => ({
                  label: new Date(trend.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }),
                  value: trend.successful + trend.failed,
                  date: trend.date,
                }))}
                title="Login Trends"
                height={250}
                color="primary"
                formatValue={(value) => `${value} logins`}
              />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Reasons */}
            <Card shadow="md">
              <CardBody>
                <BarChart
                  data={authentication.failure_reasons.slice(0, 5).map(reason => ({
                    label: reason.reason,
                    value: reason.count,
                    color: 'error',
                  }))}
                  title="Top Failure Reasons"
                  height={200}
                  horizontal={true}
                  formatValue={(value) => `${value} attempts`}
                />
              </CardBody>
            </Card>

            {/* Peak Hours */}
            <Card shadow="md">
              <CardBody>
                <HeatmapChart
                  data={authentication.peak_hours.map((hour, index) => ({
                    x: hour.hour % 6,
                    y: Math.floor(hour.hour / 6),
                    value: hour.count,
                    label: `${hour.hour}:00 - ${hour.count} logins`,
                  }))}
                  title="Activity Heatmap (24 Hours)"
                  width={300}
                  height={120}
                  xLabels={['00', '06', '12', '18', '24']}
                  yLabels={['Morning', 'Afternoon', 'Evening', 'Night']}
                  colorScheme="primary"
                  formatValue={(value) => `${value}`}
                />
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
                <DonutChart
                  data={users.role_distribution.map((role, index) => ({
                    label: role.role,
                    value: role.count,
                    color: ['primary', 'success', 'warning', 'info', 'neutral'][index % 5] as any,
                  }))}
                  title="Role Distribution"
                  size={200}
                  formatValue={(value) => `${value} users`}
                />
              </CardBody>
            </Card>

            {/* Top Active Users */}
            <Card shadow="md">
              <CardBody>
                <BarChart
                  data={users.top_active_users.slice(0, 5).map(user => ({
                    label: user.name.split(' ')[0], // First name only for space
                    value: user.action_count,
                    color: 'success',
                  }))}
                  title="Most Active Users"
                  height={200}
                  horizontal={true}
                  formatValue={(value) => `${value} actions`}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Application Analytics */}
      {applications && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-base-content">Application Usage</h2>
          
          {/* New Users Trend */}
          <Card shadow="md">
            <CardBody>
              <LineChart
                data={(users.new_users_trend || []).map(trend => ({
                  label: new Date(trend.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }),
                  value: trend.count,
                  date: trend.date,
                }))}
                title="New Users Registration Trend"
                height={200}
                color="success"
                formatValue={(value) => `${value} users`}
              />
            </CardBody>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Usage */}
            <Card shadow="md">
              <CardBody>
                <BarChart
                  data={applications.application_usage.slice(0, 5).map(app => ({
                    label: app.name.length > 10 ? app.name.substring(0, 10) + '...' : app.name,
                    value: app.request_count,
                    color: 'primary',
                  }))}
                  title="Top Applications by Requests"
                  height={200}
                  horizontal={true}
                  formatValue={(value) => `${value.toLocaleString()} requests`}
                />
              </CardBody>
            </Card>

            {/* Error Rates */}
            <Card shadow="md">
              <CardBody>
                <BarChart
                  data={applications.error_rates.filter(app => app.error_rate > 0).slice(0, 5).map(app => ({
                    label: app.application.length > 10 ? app.application.substring(0, 10) + '...' : app.application,
                    value: app.error_rate,
                    color: app.error_rate > 5 ? 'error' : app.error_rate > 2 ? 'warning' : 'success',
                  }))}
                  title="Application Error Rates"
                  height={200}
                  horizontal={true}
                  formatValue={(value) => `${value.toFixed(2)}%`}
                />
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

          {/* Security Events Trend */}
          <Card shadow="md">
            <CardBody>
              <LineChart
                data={security.security_events_trend.map(trend => ({
                  label: new Date(trend.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }),
                  value: trend.events,
                  date: trend.date,
                }))}
                title="Security Events Trend"
                height={200}
                color="warning"
                formatValue={(value) => `${value} events`}
              />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failed Login IPs */}
            <Card shadow="md">
              <CardBody>
                <BarChart
                  data={security.failed_login_ips.slice(0, 5).map(ip => ({
                    label: ip.ip_address.split('.').slice(-2).join('.'), // Show last 2 octets
                    value: ip.attempts,
                    color: 'error',
                  }))}
                  title="Suspicious IP Addresses"
                  height={200}
                  horizontal={true}
                  formatValue={(value) => `${value} attempts`}
                />
              </CardBody>
            </Card>

            {/* Permission Usage */}
            <Card shadow="md">
              <CardBody>
                <DonutChart
                  data={security.permission_usage.slice(0, 5).map((perm, index) => ({
                    label: perm.permission.split(':')[0], // Show resource only
                    value: perm.usage_count,
                    color: ['primary', 'success', 'warning', 'info', 'neutral'][index % 5] as any,
                  }))}
                  title="Permission Usage Distribution"
                  size={180}
                  formatValue={(value) => `${value} uses`}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;