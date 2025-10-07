'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { 
  PermissionPerformanceStats, 
  CachePerformanceMetrics, 
  PerformanceAlert 
} from '../../lib/permission-performance-monitor';

interface PerformanceDashboardProps {
  className?: string;
}

interface PerformanceData {
  stats: PermissionPerformanceStats;
  cacheMetrics: CachePerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: Array<{
    type: 'performance' | 'cache' | 'alerting';
    priority: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
    implementation: string;
  }>;
}

export default function PermissionPerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<number>(24 * 60 * 60 * 1000); // 24 hours

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeWindow]);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch(`/api/admin/performance/permissions?timeWindow=${timeWindow}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }
      const performanceData = await response.json();
      setData(performanceData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatLatency = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (ratio: number): string => {
    return `${(ratio * 100).toFixed(1)}%`;
  };

  const getAlertSeverityColor = (severity: PerformanceAlert['severity']): string => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Performance Data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchPerformanceData}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, cacheMetrics, alerts, recommendations } = data;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Permission System Performance</h2>
            <p className="mt-1 text-sm text-gray-500">
              Real-time monitoring of permission checks and cache performance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(Number(e.target.value))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value={60 * 60 * 1000}>Last Hour</option>
              <option value={24 * 60 * 60 * 1000}>Last 24 Hours</option>
              <option value={7 * 24 * 60 * 60 * 1000}>Last 7 Days</option>
              <option value={30 * 24 * 60 * 60 * 1000}>Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Checks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalChecks.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Latency</p>
              <p className="text-2xl font-semibold text-gray-900">{formatLatency(stats.avgLatency)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cache Hit Ratio</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPercentage(stats.cacheHitRatio)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Error Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPercentage(stats.errorRate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Performance Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Latency Distribution</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Average</span>
              <span className="text-sm font-medium text-gray-900">{formatLatency(stats.avgLatency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">95th Percentile</span>
              <span className="text-sm font-medium text-gray-900">{formatLatency(stats.p95Latency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">99th Percentile</span>
              <span className="text-sm font-medium text-gray-900">{formatLatency(stats.p99Latency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Slow Checks (&gt;50ms)</span>
              <span className="text-sm font-medium text-gray-900">{stats.slowChecks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Operations</span>
              <span className="text-sm font-medium text-gray-900">{cacheMetrics.totalOperations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Cache Hits</span>
              <span className="text-sm font-medium text-green-600">{cacheMetrics.hits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Cache Misses</span>
              <span className="text-sm font-medium text-red-600">{cacheMetrics.misses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Avg Get Latency</span>
              <span className="text-sm font-medium text-gray-900">{formatLatency(cacheMetrics.avgGetLatency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Performance Alerts</h3>
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-md border ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {new Date(alert.timestamp).toLocaleString()} • {alert.severity}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Recommendations</h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-md border ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {rec.priority === 'high' ? (
                      <ArrowTrendingUpIcon className="h-5 w-5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{rec.description}</p>
                    <p className="text-xs mt-1 opacity-75">
                      <strong>Impact:</strong> {rec.impact}
                    </p>
                    <p className="text-xs mt-1 opacity-75">
                      <strong>Implementation:</strong> {rec.implementation}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}