/**
 * System Resources Monitoring API
 * Provides CPU, memory, and system performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { getScalabilityMonitor } from '@/lib/scalability-monitor';
import { prisma } from '@/lib/db';
import { cpus, freemem, totalmem, loadavg, uptime } from 'os';

/**
 * GET /api/admin/monitoring/system-resources
 * Get system resource metrics including CPU, memory, and performance data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, { resource: 'monitoring', action: 'read', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for system monitoring' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000'); // Default 1 hour
    const includeRealtime = searchParams.get('includeRealtime') === 'true';

    const scalabilityMonitor = getScalabilityMonitor(prisma);
    const systemMetrics = scalabilityMonitor.getSystemMetrics(timeWindow);

    // Calculate summary statistics
    let summary = {
      averageCpuUsage: 0,
      peakCpuUsage: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      averageEventLoopDelay: 0,
      peakEventLoopDelay: 0
    };

    if (systemMetrics.length > 0) {
      summary = {
        averageCpuUsage: systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length,
        peakCpuUsage: Math.max(...systemMetrics.map(m => m.cpu.usage)),
        averageMemoryUsage: systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length,
        peakMemoryUsage: Math.max(...systemMetrics.map(m => m.memory.usage)),
        averageEventLoopDelay: systemMetrics.reduce((sum, m) => sum + m.eventLoop.delay, 0) / systemMetrics.length,
        peakEventLoopDelay: Math.max(...systemMetrics.map(m => m.eventLoop.delay))
      };
    }

    const response: any = {
      success: true,
      data: {
        metrics: systemMetrics,
        summary,
        timestamp: Date.now()
      }
    };

    if (includeRealtime) {
      // Get current real-time system information
      const memUsage = process.memoryUsage();
      const totalMem = totalmem();
      const freeMem = freemem();
      const usedMem = totalMem - freeMem;
      const cpuCount = cpus().length;
      const loadAverages = loadavg();
      const systemUptime = uptime();

      response.data.realtime = {
        cpu: {
          cores: cpuCount,
          loadAverage: loadAverages,
          usage: Math.min(100, (loadAverages[0] / cpuCount) * 100)
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usage: (usedMem / totalMem) * 100
        },
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
          usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        system: {
          uptime: systemUptime,
          hostname: require('os').hostname(),
          type: require('os').type(),
          release: require('os').release()
        },
        timestamp: Date.now()
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching system resource metrics:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch system resource metrics',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/monitoring/system-resources
 * Trigger system resource analysis or cleanup operations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user, { resource: 'monitoring', action: 'manage', scope: 'all' })) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions for system monitoring management' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, parameters } = body;

    switch (action) {
      case 'triggerGarbageCollection':
        // Trigger garbage collection if available
        if (global.gc) {
          const beforeMemory = process.memoryUsage();
          global.gc();
          const afterMemory = process.memoryUsage();
          
          return NextResponse.json({
            success: true,
            data: {
              garbageCollection: {
                triggered: true,
                memoryBefore: beforeMemory,
                memoryAfter: afterMemory,
                memoryFreed: {
                  heapUsed: beforeMemory.heapUsed - afterMemory.heapUsed,
                  heapTotal: beforeMemory.heapTotal - afterMemory.heapTotal,
                  external: beforeMemory.external - afterMemory.external
                },
                timestamp: Date.now()
              }
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            error: {
              code: 'GC_NOT_AVAILABLE',
              message: 'Garbage collection is not available. Start Node.js with --expose-gc flag.'
            }
          });
        }

      case 'getDetailedMemoryUsage':
        // Get detailed memory usage information
        const memUsage = process.memoryUsage();
        const v8HeapStats = require('v8').getHeapStatistics();
        const v8HeapSpaceStats = require('v8').getHeapSpaceStatistics();

        return NextResponse.json({
          success: true,
          data: {
            detailedMemory: {
              process: memUsage,
              v8Heap: v8HeapStats,
              v8HeapSpaces: v8HeapSpaceStats,
              timestamp: Date.now()
            }
          }
        });

      case 'analyzePerformance':
        // Analyze system performance trends
        const scalabilityMonitor = getScalabilityMonitor(prisma);
        const systemMetrics = scalabilityMonitor.getSystemMetrics(24 * 60 * 60 * 1000); // Last 24 hours

        if (systemMetrics.length === 0) {
          return NextResponse.json({
            success: true,
            data: {
              analysis: {
                message: 'No performance data available for analysis',
                recommendations: []
              }
            }
          });
        }

        // Analyze trends
        const cpuTrend = this.calculateTrend(systemMetrics.map(m => m.cpu.usage));
        const memoryTrend = this.calculateTrend(systemMetrics.map(m => m.memory.usage));
        const eventLoopTrend = this.calculateTrend(systemMetrics.map(m => m.eventLoop.delay));

        const recommendations: Array<{
          type: 'cpu' | 'memory' | 'eventloop' | 'general';
          priority: 'low' | 'medium' | 'high';
          description: string;
          impact: string;
          action: string;
        }> = [];

        // Generate recommendations based on trends
        if (cpuTrend > 0.1) {
          recommendations.push({
            type: 'cpu',
            priority: 'high',
            description: 'CPU usage is trending upward',
            impact: 'Potential performance degradation and increased response times',
            action: 'Consider scaling up CPU resources or optimizing CPU-intensive operations'
          });
        }

        if (memoryTrend > 0.1) {
          recommendations.push({
            type: 'memory',
            priority: 'high',
            description: 'Memory usage is trending upward',
            impact: 'Risk of memory exhaustion and application crashes',
            action: 'Investigate memory leaks, optimize memory usage, or increase available memory'
          });
        }

        if (eventLoopTrend > 0.1) {
          recommendations.push({
            type: 'eventloop',
            priority: 'medium',
            description: 'Event loop delay is increasing',
            impact: 'Slower response times and reduced throughput',
            action: 'Optimize blocking operations and consider using worker threads for CPU-intensive tasks'
          });
        }

        const latestMetrics = systemMetrics[systemMetrics.length - 1];
        if (latestMetrics.cpu.usage > 80) {
          recommendations.push({
            type: 'cpu',
            priority: 'high',
            description: `Current CPU usage is ${latestMetrics.cpu.usage.toFixed(1)}%`,
            impact: 'High CPU usage may cause performance issues',
            action: 'Monitor CPU-intensive processes and consider load balancing'
          });
        }

        if (latestMetrics.memory.usage > 85) {
          recommendations.push({
            type: 'memory',
            priority: 'high',
            description: `Current memory usage is ${latestMetrics.memory.usage.toFixed(1)}%`,
            impact: 'High memory usage may lead to swapping and performance degradation',
            action: 'Free up memory or increase available system memory'
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            analysis: {
              timeWindow: '24 hours',
              trends: {
                cpu: cpuTrend,
                memory: memoryTrend,
                eventLoop: eventLoopTrend
              },
              current: {
                cpu: latestMetrics.cpu.usage,
                memory: latestMetrics.memory.usage,
                eventLoop: latestMetrics.eventLoop.delay
              },
              recommendations
            }
          }
        });

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in system resource monitoring:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to execute system monitoring action',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }

  /**
   * Calculate trend (slope) of a data series
   */
  function calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}