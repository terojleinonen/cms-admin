'use client';

import React, { useState } from 'react';
import {
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CogIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  details?: Record<string, any>;
}

interface SecurityAlertsPanelProps {
  alerts: Alert[];
  onRefresh: () => void;
  onAcknowledge: (alertId: string) => void;
}

export function SecurityAlertsPanel({ alerts, onRefresh, onAcknowledge }: SecurityAlertsPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertSettings, setAlertSettings] = useState({
    soundEnabled: true,
    autoRefresh: true,
    showResolved: false
  });

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
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="space-y-6">
      {/* Alert Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Alert Management</h3>
            <p className="text-sm text-gray-500">
              {activeAlerts.length} active alerts, {acknowledgedAlerts.length} acknowledged
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAlertSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className={`p-2 rounded-md ${alertSettings.soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {alertSettings.soundEnabled ? (
                  <SpeakerWaveIcon className="h-4 w-4" />
                ) : (
                  <SpeakerXMarkIcon className="h-4 w-4" />
                )}
              </button>
              
              <button
                onClick={() => setAlertSettings(prev => ({ ...prev, showResolved: !prev.showResolved }))}
                className={`px-3 py-1 text-sm rounded-md ${alertSettings.showResolved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
              >
                {alertSettings.showResolved ? 'Hide Resolved' : 'Show Resolved'}
              </button>
            </div>
            
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              Active Security Alerts ({activeAlerts.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {formatAlertType(alert.type)}
                        </h4>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(alert.triggeredAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setSelectedAlert(alert)}
                      variant="outline"
                      size="sm"
                    >
                      Details
                    </Button>
                    <Button
                      onClick={() => onAcknowledge(alert.id)}
                      size="sm"
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {alertSettings.showResolved && acknowledgedAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              Acknowledged Alerts ({acknowledgedAlerts.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {acknowledgedAlerts.map((alert) => (
              <div key={alert.id} className="p-6 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          {formatAlertType(alert.type)}
                        </h4>
                        <Badge className="bg-green-100 text-green-800">
                          Acknowledged
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(alert.acknowledgedAt || alert.triggeredAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Acknowledged by: {alert.acknowledgedBy || 'System'} at{' '}
                        {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setSelectedAlert(alert)}
                    variant="outline"
                    size="sm"
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts State */}
      {activeAlerts.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Alerts</h3>
          <p className="mt-1 text-sm text-gray-500">
            All security alerts have been acknowledged. The system is monitoring for new threats.
          </p>
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getSeverityIcon(selectedAlert.severity)}
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {formatAlertType(selectedAlert.type)}
                  </h4>
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-900">Message</h5>
                <p className="mt-1 text-sm text-gray-600">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Triggered At</h5>
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date(selectedAlert.triggeredAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Status</h5>
                  <p className="mt-1">
                    {selectedAlert.acknowledged ? (
                      <Badge className="bg-green-100 text-green-800">Acknowledged</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Active</Badge>
                    )}
                  </p>
                </div>
              </div>

              {selectedAlert.acknowledged && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">Acknowledged By</h5>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedAlert.acknowledgedBy || 'System'}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">Acknowledged At</h5>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedAlert.acknowledgedAt 
                        ? new Date(selectedAlert.acknowledgedAt).toLocaleString()
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
              )}

              {selectedAlert.details && (
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Additional Details</h5>
                  <div className="mt-1 bg-gray-50 rounded-md p-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setSelectedAlert(null)}
                  variant="outline"
                >
                  Close
                </Button>
                {!selectedAlert.acknowledged && (
                  <Button
                    onClick={() => {
                      onAcknowledge(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                  >
                    Acknowledge Alert
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}