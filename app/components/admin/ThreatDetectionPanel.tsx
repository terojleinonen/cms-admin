'use client';

import React, { useState, useEffect } from 'react';
import {
  FireIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  UserIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ThreatDetectionPanelProps {
  data: any;
  onRefresh: () => void;
}

interface ThreatPattern {
  id: string;
  type: string;
  description: string;
  severity: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  affectedIPs: string[];
  affectedUsers: string[];
  mitigationStatus: 'ACTIVE' | 'MITIGATED' | 'MONITORING';
}

interface ThreatIntelligence {
  riskScore: number;
  threatLevel: string;
  activeCampaigns: number;
  blockedAttacks: number;
  topAttackVectors: Array<{
    vector: string;
    count: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  }>;
  geographicThreats: Array<{
    country: string;
    count: number;
    riskLevel: string;
  }>;
}

export function ThreatDetectionPanel({ data, onRefresh }: ThreatDetectionPanelProps) {
  const [threatPatterns, setThreatPatterns] = useState<ThreatPattern[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<ThreatPattern | null>(null);

  useEffect(() => {
    fetchThreatData();
  }, []);

  const fetchThreatData = async () => {
    try {
      setLoading(true);
      const [patternsResponse, intelResponse] = await Promise.all([
        fetch('/api/admin/security/threat-patterns'),
        fetch('/api/admin/security/threat-intelligence')
      ]);

      if (patternsResponse.ok) {
        const patterns = await patternsResponse.json();
        setThreatPatterns(patterns);
      }

      if (intelResponse.ok) {
        const intel = await intelResponse.json();
        setThreatIntel(intel);
      }
    } catch (error) {
      console.error('Failed to fetch threat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMitigateThreat = async (patternId: string) => {
    try {
      const response = await fetch(`/api/admin/security/threat-patterns/${patternId}/mitigate`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchThreatData();
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to mitigate threat:', error);
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'DOWN':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'LOW':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Threat Intelligence Overview */}
      {threatIntel && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Intelligence Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getRiskLevelColor(threatIntel.threatLevel)}`}>
                {threatIntel.riskScore}
              </div>
              <div className="text-sm text-gray-500">Risk Score</div>
              <div className={`text-sm font-medium ${getRiskLevelColor(threatIntel.threatLevel)}`}>
                {threatIntel.threatLevel}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{threatIntel.activeCampaigns}</div>
              <div className="text-sm text-gray-500">Active Campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{threatIntel.blockedAttacks}</div>
              <div className="text-sm text-gray-500">Blocked Attacks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{threatPatterns.length}</div>
              <div className="text-sm text-gray-500">Detected Patterns</div>
            </div>
          </div>
        </div>
      )}

      {/* Attack Vectors and Geographic Threats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Attack Vectors */}
        {threatIntel?.topAttackVectors && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Attack Vectors</h3>
            <div className="space-y-3">
              {threatIntel.topAttackVectors.map((vector, index) => (
                <div key={vector.vector} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                    <span className="text-sm text-gray-600">{vector.vector}</span>
                    {getTrendIcon(vector.trend)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((vector.count / Math.max(...threatIntel.topAttackVectors.map(v => v.count))) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{vector.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geographic Threats */}
        {threatIntel?.geographicThreats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Threat Sources</h3>
            <div className="space-y-3">
              {threatIntel.geographicThreats.map((geo, index) => (
                <div key={geo.country} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{geo.country}</span>
                    <Badge className={getSeverityColor(geo.riskLevel)}>
                      {geo.riskLevel}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{geo.count} threats</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Threat Patterns */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Detected Threat Patterns</h3>
            <Button onClick={fetchThreatData} variant="outline" size="sm">
              Refresh Patterns
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threat Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occurrences
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affected Assets
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
              {threatPatterns.map((pattern) => (
                <tr key={pattern.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FireIcon className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pattern.type}</div>
                        <div className="text-sm text-gray-500">{pattern.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getSeverityColor(pattern.severity)}>
                      {pattern.severity}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pattern.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{pattern.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pattern.occurrences}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <ComputerDesktopIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{pattern.affectedIPs.length} IPs</span>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{pattern.affectedUsers.length} Users</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={
                      pattern.mitigationStatus === 'MITIGATED' ? 'bg-green-100 text-green-800' :
                      pattern.mitigationStatus === 'MONITORING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {pattern.mitigationStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setSelectedPattern(pattern)}
                        variant="outline"
                        size="sm"
                      >
                        Details
                      </Button>
                      {pattern.mitigationStatus === 'ACTIVE' && (
                        <Button
                          onClick={() => handleMitigateThreat(pattern.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          Mitigate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {threatPatterns.length === 0 && (
          <div className="text-center py-8">
            <FireIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No threat patterns detected</h3>
            <p className="mt-1 text-sm text-gray-500">The system is currently monitoring for threats.</p>
          </div>
        )}
      </div>

      {/* Threat Pattern Details Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Threat Pattern Details</h3>
              <button
                onClick={() => setSelectedPattern(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Pattern Information</h4>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="font-medium">{selectedPattern.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <div>
                      <Badge className={getSeverityColor(selectedPattern.severity)}>
                        {selectedPattern.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <div className="font-medium">{selectedPattern.confidence}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Occurrences:</span>
                    <div className="font-medium">{selectedPattern.occurrences}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Description</h4>
                <p className="mt-1 text-sm text-gray-600">{selectedPattern.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Affected IP Addresses</h4>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedPattern.affectedIPs.map((ip) => (
                    <Badge key={ip} className="bg-gray-100 text-gray-800">
                      {ip}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Affected Users</h4>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedPattern.affectedUsers.map((user) => (
                    <Badge key={user} className="bg-blue-100 text-blue-800">
                      {user}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setSelectedPattern(null)}
                  variant="outline"
                >
                  Close
                </Button>
                {selectedPattern.mitigationStatus === 'ACTIVE' && (
                  <Button
                    onClick={() => {
                      handleMitigateThreat(selectedPattern.id);
                      setSelectedPattern(null);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Mitigate Threat
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