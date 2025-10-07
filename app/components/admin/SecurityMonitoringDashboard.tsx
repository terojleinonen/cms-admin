'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

interface SecurityDashboardData {
  summary: {
    totalEvents: number;
    criticalEvents: number;
    unresolvedEvents: number;
    blockedIPs: number;
  };
  eventsByType: Array<{ type: string; count: number }>;
  eventsBySeverity: Array<{ severity: string; count: number }>;
  recentEvents: Array<{
    id: string;
    type: string;
    severity: string;
    userId?: string;
    ipAddress?: string;
    createdAt: string;
    resolved: boolean;
    user?: {
      name: string;
      email: string;
    };
  }>;
  topThreats: Array<{ type: string; count: number }>;
  timeline: Array<{ date: string; count: number }>;
}

interface SecurityMonitoringDashboardProps {
  refreshInterval?: number;
}

export function SecurityMonitoringDashboard({ refreshInterval = 30000 }: SecurityMonitoringDashboardProps) {
  const [data, setData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(7);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin/security/dashboard?days=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch security dashboard data');
      }
      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedTimeRange, refreshInterval]);

  const handleResolveEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}/resolve`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve security event');
      }
      
      // Refresh data
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to resolve event:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <EyeIcon className="h-4 w-4" />;
    }
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!data) {
    return <ErrorMessage message="No security data available" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
          <p className="text-gray-600">Real-time security event monitoring and alerting</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical Events</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.criticalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unresolved</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.unresolvedEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ComputerDesktopIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blocked IPs</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.blockedIPs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Events by Type</h3>
          <div className="space-y-3">
            {data.eventsByType.slice(0, 8).map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatEventType(item.type)}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((item.count / Math.max(...data.eventsByType.map(e => e.count))) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events by Severity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Events by Severity</h3>
          <div className="space-y-3">
            {data.eventsBySeverity.map((item) => (
              <div key={item.severity} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(item.severity)}
                  <span className="text-sm text-gray-600">{item.severity}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.severity === 'CRITICAL' ? 'bg-red-600' :
                        item.severity === 'HIGH' ? 'bg-orange-600' :
                        item.severity === 'MEDIUM' ? 'bg-yellow-600' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min((item.count / Math.max(...data.eventsBySeverity.map(e => e.count))) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getSeverityIcon(event.severity)}
                      <span className="ml-2 text-sm text-gray-900">
                        {formatEventType(event.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getSeverityColor(event.severity)}>
                      {event.severity}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {event.user ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{event.user.name}</div>
                        <div className="text-sm text-gray-500">{event.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.ipAddress || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {event.resolved ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Resolved</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        <span className="text-sm">Open</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!event.resolved && (
                      <Button
                        onClick={() => handleResolveEvent(event.id)}
                        variant="outline"
                        size="sm"
                      >
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {data.recentEvents.length === 0 && (
          <div className="text-center py-8">
            <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No security events</h3>
            <p className="mt-1 text-sm text-gray-500">No security events found for the selected time period.</p>
          </div>
        )}
      </div>

      {/* Top Threats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Security Threats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topThreats.map((threat, index) => (
            <div key={threat.type} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    #{index + 1} {formatEventType(threat.type)}
                  </h4>
                  <p className="text-2xl font-bold text-gray-900">{threat.count}</p>
                  <p className="text-sm text-gray-500">events</p>
                </div>
                <div className="text-right">
                  <ChartBarIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}