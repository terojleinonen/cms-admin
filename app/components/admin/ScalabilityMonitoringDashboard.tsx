'use client';

/**
 * Scalability Monitoring Dashboard
 * Comprehensive dashboard for monitoring concurrent users, database performance, and system resources
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  ServerIcon, 
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

interface ScalabilityMetrics {
  concurrentUserMetrics: any[];
  databaseMetrics: any[];
  systemMetrics: any[];
  alerts: any[];
  summary: {
    peakConcurrentUsers: number;
    averageUsers: number;
    totalPermissionChecks: number;
    averageQueryLatency: number;
    peakCpuUsage: number;
    peakMemoryUsage: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    impact: string;
    implementation: string;
  }>;
}

interface RealtimeSystemInfo {
  cpu: {
    cores: number;
    loadAverage: number[];
    usage: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  heap: {
    used: number;
    total: number;
    usage: number;
  };
  process: {
    uptime: number;
    pid: number;
    version: string;
  };
}

export default function ScalabilityMonitoringDashboard() {
  const [metrics, setMetrics] = useState<ScalabilityMetrics | null>(null);
  const [realtimeSystem, setRealtimeSystem] = useState<RealtimeSystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(3600000); // 1 hour
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const fetchMetrics = useCallback(async () => {
    try {
      const [scalabilityResponse, systemResponse] = await Promise.all([
        fetch(`/api/admin/monitoring/scalability?timeWindow=${timeWindow}&includeReport=true`),
        fetch('/api/admin/monitoring/system-resources?includeRealtime=true')
      ]);

      if (!scalabilityResponse.ok || !systemResponse.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const scalabilityData = await scalabilityResponse.json();
      const systemData = await systemResponse.json();

      if (scalabilityData.success) {
        setMetrics(scalabilityData.data.report || scalabilityData.data);
      }

      if (systemData.success && systemData.data.realtime) {
        setRealtimeSystem(systemData.data.realtime);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getAlertColor = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading scalability metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">Error loading metrics: {error}</span>
        </div>
        <button
          onClick={fetchMetrics}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scalability Monitoring</h1>
          <p className="text-gray-600">Monitor concurrent users, database performance, and system resources</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={3600000}>Last Hour</option>
            <option value={21600000}>Last 6 Hours</option>
            <option value={86400000}>Last 24 Hours</option>
            <option value={604800000}>Last Week</option>
          </select>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak Concurrent Users</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.peakConcurrentUsers}</p>
                <p className="text-sm text-gray-500">Avg: {Math.round(metrics.summary.averageUsers)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CircleStackIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Query Latency</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.averageQueryLatency.toFixed(1)}ms</p>
                <p className="text-sm text-gray-500">Database performance</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CpuChipIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak CPU Usage</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.peakCpuUsage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">System resources</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ServerIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.peakMemoryUsage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">System memory</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time System Information */}
      {realtimeSystem && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Real-time System Status</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">CPU</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Usage:</span>
                    <span className="text-sm font-medium">{realtimeSystem.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Cores:</span>
                    <span className="text-sm font-medium">{realtimeSystem.cpu.cores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Load Avg:</span>
                    <span className="text-sm font-medium">{realtimeSystem.cpu.loadAverage[0].toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Memory</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Usage:</span>
                    <span className="text-sm font-medium">{realtimeSystem.memory.usage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Used:</span>
                    <span className="text-sm font-medium">{formatBytes(realtimeSystem.memory.used)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total:</span>
                    <span className="text-sm font-medium">{formatBytes(realtimeSystem.memory.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Process</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Uptime:</span>
                    <span className="text-sm font-medium">{formatDuration(realtimeSystem.process.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">PID:</span>
                    <span className="text-sm font-medium">{realtimeSystem.process.pid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Node:</span>
                    <span className="text-sm font-medium">{realtimeSystem.process.version}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {metrics && metrics.alerts && metrics.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {metrics.alerts.slice(0, 10).map((alert: any, index: number) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm mt-1">
                          Type: {alert.type} | Severity: {alert.severity}
                        </p>
                        <p className="text-xs mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded">
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {metrics && metrics.recommendations && metrics.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Performance Recommendations</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {metrics.recommendations.map((rec: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(rec.priority)}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 uppercase">{rec.type}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{rec.description}</h3>
                      <p className="text-sm text-gray-600 mb-2">{rec.impact}</p>
                      <p className="text-sm text-blue-600">{rec.implementation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Concurrent Users Over Time</h2>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <ChartBarIcon className="h-8 w-8 mr-2" />
              <span>Chart visualization would be implemented here</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Resource Usage</h2>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <ChartBarIcon className="h-8 w-8 mr-2" />
              <span>Chart visualization would be implemented here</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}