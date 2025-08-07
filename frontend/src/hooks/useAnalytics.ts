import { useState, useEffect } from 'react';
import { analyticsApi } from '../services/api';
import type { 
  AuthenticationAnalytics, 
  UserAnalytics, 
  ApplicationAnalytics, 
  SecurityAnalytics,
  AnalyticsTimeRange 
} from '../types';

interface UseAnalyticsReturn {
  authentication: AuthenticationAnalytics | null;
  users: UserAnalytics | null;
  applications: ApplicationAnalytics | null;
  security: SecurityAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAnalytics = (timeRange: AnalyticsTimeRange): UseAnalyticsReturn => {
  const [authentication, setAuthentication] = useState<AuthenticationAnalytics | null>(null);
  const [users, setUsers] = useState<UserAnalytics | null>(null);
  const [applications, setApplications] = useState<ApplicationAnalytics | null>(null);
  const [security, setSecurity] = useState<SecurityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [authResponse, usersResponse, appsResponse, securityResponse] = await Promise.all([
        analyticsApi.getAuthenticationAnalytics(timeRange),
        analyticsApi.getUserAnalytics(timeRange),
        analyticsApi.getApplicationAnalytics(timeRange),
        analyticsApi.getSecurityAnalytics(timeRange),
      ]);

      if (authResponse.success && authResponse.data) {
        setAuthentication(authResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }

      if (appsResponse.success && appsResponse.data) {
        setApplications(appsResponse.data);
      }

      if (securityResponse.success && securityResponse.data) {
        setSecurity(securityResponse.data);
      }

      // If any request failed, set error
      const failedResponses = [authResponse, usersResponse, appsResponse, securityResponse]
        .filter(response => !response.success);
      
      if (failedResponses.length > 0) {
        setError('Failed to load some analytics data');
      }

    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange.start_date, timeRange.end_date, timeRange.range]);

  const refetch = async () => {
    await fetchAnalytics();
  };

  return {
    authentication,
    users,
    applications,
    security,
    isLoading,
    error,
    refetch,
  };
};