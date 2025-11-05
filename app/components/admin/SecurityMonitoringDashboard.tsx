'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  FireIcon,
  LockClosedIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
// Import sub-components (these will be created as separate components)
// import { SecurityIncidentModal } from './SecurityIncidentModal';
// import { ThreatDetectionPanel } from './ThreatDetectionPanel';
// import { SecurityAlertsPanel } from './SecurityAlertsPanel';

interface SecurityDashboardData {
  summary: {
    totalEvents: number;
    criticalEvents: number;
    unresolvedEvents: number;
    blockedIPs: number;
    activeThreats: number;
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
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
    acknowledged: boolean;
    user?: {
      name: string;
      email: string;
    };
    details?: Record<string, any>;
  }>;
  topThreats: Array<{ type: string; count: number; trend: 'UP' | 'DOWN' | 'STABLE' }>;
  timeline: Array<{ date: string; count: number }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    triggeredAt: string;
    acknowledged: boolean;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
    createdAt: string;
    assignedTo?: string;
  }>;
  threatIntelligence: {
    riskScore: number;
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    activeCampaigns: number;
    blockedAttacks: number;
  };
}

interface SecurityMonitoringDashboardProps {
  refreshInterval?: number;
}

export function SecurityMonitoringDashboard({ refreshInterval = 30000 }: SecurityMonitoringDashboardProps) {
  const [data, setData] = useState<SecurityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(7);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'threats' | 'alerts' | 'incidents'>('overview');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    status: '',
    search: ''
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        days: selectedTimeRange.toString(),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/admin/security/dashboard?${queryParams}`);
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
  }, [selectedTimeRange, filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!realTimeEnabled) return;
    
    // Set up auto-refresh for real-time monitoring
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval, realTimeEnabled]);

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

  const handleAcknowledgeEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}/acknowledge`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to acknowledge security event');
      }
      
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to acknowledge event:', err);
    }
  };

  const handleCreateIncident = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin/security/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          title: `Security Incident - ${data?.recentEvents.find(e => e.id === eventId)?.type}`,
          severity: data?.recentEvents.find(e => e.id === eventId)?.severity || 'MEDIUM',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create security incident');
      }
      
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to create incident:', err);
    }
  };

  const handleBlockIP = async (ipAddress: string) => {
    try {
      const response = await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ipAddress }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to block IP address');
      }
      
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to block IP:', err);
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
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Monitoring</h1>
            <p className="text-gray-600">Real-time security event monitoring and threat detection</p>
          </div>
          
          {data?.summary.systemHealth && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                data.summary.systemHealth === 'HEALTHY' ? 'bg-green-500' :
                data.summary.systemHealth === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className={`text-sm font-medium ${
                data.summary.systemHealth === 'HEALTHY' ? 'text-green-700' :
                data.summary.systemHealth === 'WARNING' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {data.summary.systemHealth}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            variant={realTimeEnabled ? "default" : "outline"}
            size="sm"
            className="flex items-center space-x-2"
          >
            {realTimeEnabled ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            <span>{realTimeEnabled ? 'Pause' : 'Resume'} Live</span>
          </Button>
          
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
            className="flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'events', name: 'Security Events', icon: ShieldExclamationIcon },
            { id: 'threats', name: 'Threat Detection', icon: FireIcon },
            { id: 'alerts', name: 'Active Alerts', icon: BellIcon },
            { id: 'incidents', name: 'Incidents', icon: DocumentTextIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
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
              <LockClosedIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Blocked IPs</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.blockedIPs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FireIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Threats</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.activeThreats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BellIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{data.alerts?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
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

          {/* Threat Intelligence */}
          {data.threatIntelligence && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Intelligence</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    data.threatIntelligence.riskScore >= 80 ? 'text-red-600' :
                    data.threatIntelligence.riskScore >= 60 ? 'text-orange-600' :
                    data.threatIntelligence.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {data.threatIntelligence.riskScore}
                  </div>
                  <div className="text-sm text-gray-500">Risk Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${
                    data.threatIntelligence.threatLevel === 'CRITICAL' ? 'text-red-600' :
                    data.threatIntelligence.threatLevel === 'HIGH' ? 'text-orange-600' :
                    data.threatIntelligence.threatLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {data.threatIntelligence.threatLevel}
                  </div>
                  <div className="text-sm text-gray-500">Threat Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.threatIntelligence.activeCampaigns}</div>
                  <div className="text-sm text-gray-500">Active Campaigns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.threatIntelligence.blockedAttacks}</div>
                  <div className="text-sm text-gray-500">Blocked Attacks</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'threats' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Detection</h3>
          <p className="text-gray-600">Threat detection panel will be implemented here.</p>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Alerts</h3>
          <p className="text-gray-600">Security alerts panel will be implemented here.</p>
        </div>
      )}

      {(activeTab === 'events' || activeTab === 'overview') && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {activeTab === 'overview' ? 'Recent Security Events' : 'Security Events'}
              </h3>
              
              {activeTab === 'events' && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                    className="border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              )}
            </div>
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
                {data.recentEvents.slice(0, activeTab === 'overview' ? 10 : undefined).map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSeverityIcon(event.severity)}
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {formatEventType(event.type)}
                        </button>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">{event.ipAddress || 'N/A'}</span>
                        {event.ipAddress && (
                          <Button
                            onClick={() => handleBlockIP(event.ipAddress!)}
                            variant="outline"
                            size="xs"
                            className="text-red-600 hover:text-red-800"
                          >
                            Block
                          </Button>
                        )}
                      </div>
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
                      ) : event.acknowledged ? (
                        <div className="flex items-center text-yellow-600">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Acknowledged</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">Open</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {!event.acknowledged && !event.resolved && (
                          <Button
                            onClick={() => handleAcknowledgeEvent(event.id)}
                            variant="outline"
                            size="sm"
                          >
                            Acknowledge
                          </Button>
                        )}
                        {!event.resolved && (
                          <Button
                            onClick={() => handleResolveEvent(event.id)}
                            variant="outline"
                            size="sm"
                          >
                            Resolve
                          </Button>
                        )}
                        <Button
                          onClick={() => handleCreateIncident(event.id)}
                          variant="outline"
                          size="sm"
                        >
                          Create Incident
                        </Button>
                      </div>
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
      )}

      {activeTab === 'incidents' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Security Incidents</h3>
              <Button
                onClick={() => setShowIncidentModal(true)}
                className="flex items-center space-x-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span>Create Incident</span>
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.incidents?.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={
                        incident.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        incident.status === 'INVESTIGATING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {incident.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incident.assignedTo || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(incident.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Threats - Show on overview */}
      {activeTab === 'overview' && (
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
                    <div className="flex items-center space-x-2">
                      <ChartBarIcon className="h-8 w-8 text-gray-400" />
                      {threat.trend && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          threat.trend === 'UP' ? 'bg-red-100 text-red-800' :
                          threat.trend === 'DOWN' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {threat.trend}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals - Simplified for now */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              <p><strong>Type:</strong> {formatEventType(selectedEvent.type)}</p>
              <p><strong>Severity:</strong> {selectedEvent.severity}</p>
              <p><strong>Time:</strong> {new Date(selectedEvent.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {showIncidentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Incident</h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600">Incident creation form will be implemented here.</p>
          </div>
        </div>
      )}
    </div>
  );
}