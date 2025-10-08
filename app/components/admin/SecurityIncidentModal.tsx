'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SecurityIncidentModalProps {
  event?: {
    id: string;
    type: string;
    severity: string;
    userId?: string;
    ipAddress?: string;
    createdAt: string;
    details?: Record<string, any>;
    user?: {
      name: string;
      email: string;
    };
  };
  onClose: () => void;
  onCreateIncident: (eventId?: string) => void;
}

export function SecurityIncidentModal({ event, onClose, onCreateIncident }: SecurityIncidentModalProps) {
  const [incidentData, setIncidentData] = useState({
    title: event ? `Security Incident - ${event.type.replace(/_/g, ' ')}` : '',
    description: '',
    severity: event?.severity || 'MEDIUM',
    assignedTo: '',
    priority: 'MEDIUM',
    category: 'SECURITY_BREACH'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateIncident(event?.id);
    onClose();
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {event ? 'Create Incident from Security Event' : 'Create New Security Incident'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {event && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Source Security Event</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Event Type:</span>
                <div className="font-medium">{event.type.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <span className="text-gray-500">Severity:</span>
                <div>
                  <Badge className={getSeverityColor(event.severity)}>
                    {event.severity}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <div className="font-medium">{new Date(event.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-500">IP Address:</span>
                <div className="font-medium">{event.ipAddress || 'N/A'}</div>
              </div>
              {event.user && (
                <div className="col-span-2">
                  <span className="text-gray-500">User:</span>
                  <div className="font-medium">{event.user.name} ({event.user.email})</div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Incident Title
            </label>
            <input
              type="text"
              id="title"
              value={incidentData.title}
              onChange={(e) => setIncidentData(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={incidentData.description}
              onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the security incident, impact, and any initial findings..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700">
                Severity
              </label>
              <select
                id="severity"
                value={incidentData.severity}
                onChange={(e) => setIncidentData(prev => ({ ...prev, severity: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                value={incidentData.priority}
                onChange={(e) => setIncidentData(prev => ({ ...prev, priority: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                value={incidentData.category}
                onChange={(e) => setIncidentData(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SECURITY_BREACH">Security Breach</option>
                <option value="DATA_LEAK">Data Leak</option>
                <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                <option value="MALWARE">Malware</option>
                <option value="PHISHING">Phishing</option>
                <option value="DDOS">DDoS Attack</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
                Assign To
              </label>
              <input
                type="text"
                id="assignedTo"
                value={incidentData.assignedTo}
                onChange={(e) => setIncidentData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter username or email"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex items-center space-x-2"
            >
              <ShieldExclamationIcon className="h-4 w-4" />
              <span>Create Incident</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}