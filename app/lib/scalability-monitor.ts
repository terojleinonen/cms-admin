/**
 * Scalability Monitoring Service
 * Monitors concurrent users, database performance, and system resources for RBAC system
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import { cpus, freemem, totalmem, loadavg } from 'os';

export interface ConcurrentUserMetrics {
  timestamp: number;
  activeUsers: number;
  concurrentPermissionChecks: number;
  peakConcurrentUsers: number;
  userSessions: Map<string, UserSessionInfo>;
  permissionCheckRate: number; // checks per second
  averageSessionDuration: number;
}

export interface UserSessionInfo {
  userId: string;
  sessionStart: number;
  lastActivity: number;
  permissionChecksCount: number;
  role: string;
  ipAddress?: string;
}

export interface DatabasePerformanceMetrics {
  timestamp: number;
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  queryLatency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: number;
    parameters?: any[];
  }>;
  queryThroughput: number; // queries per second
  connectionErrors: number;
  deadlocks: number;
}

export interface SystemResourceMetrics {
  timestamp: number;
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number; // bytes
    free: number; // bytes
    total: number; // bytes
    usage: number; // percentage
  };
  heap: {
    used: number;
    total: number;
    limit: number;
    usage: number; // percentage
  };
  eventLoop: {
    delay: number; // milliseconds
    utilization: number; // percentage
  };
}

export interface ScalabilityAlert {
  id: string;
  type: 'HIGH_CONCURRENT_USERS' | 'DATABASE_OVERLOAD' | 'HIGH_CPU_USAGE' | 'HIGH_MEMORY_USAGE' | 'SLOW_QUERIES' | 'CONNECTION_POOL_EXHAUSTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface ScalabilityThresholds {
  maxConcurrentUsers: number;
  maxPermissionCheckRate: number;
  maxQueryLatency: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxEventLoopDelay: number;
  minConnectionPoolAvailable: number;
  slowQueryThreshold: number;
}

/**
 * Scalability Monitoring Service
 * Comprehensive monitoring for system scalability and performance
 */
export class ScalabilityMonitor {
  private static instance: ScalabilityMonitor;
  private prisma: PrismaClient;
  
  // Metrics storage
  private concurrentUserMetrics: ConcurrentUserMetrics[] = [];
  private databaseMetrics: DatabasePerformanceMetrics[] = [];
  private systemMetrics: SystemResourceMetrics[] = [];
  private alerts: ScalabilityAlert[] = [];
  
  // Active tracking
  private activeSessions: Map<string, UserSessionInfo> = new Map();
  private activePermissionChecks: Map<string, number> = new Map();
  private queryTimes: number[] = [];
  private slowQueries: Array<{ query: string; duration: number; timestamp: number; parameters?: any[] }> = [];
  
  // Configuration
  private readonly maxMetricsHistory = 10000;
  private readonly maxAlertsHistory = 1000;
  private readonly defaultThresholds: ScalabilityThresholds = {
    maxConcurrentUsers: 1000,
    maxPermissionCheckRate: 10000, // per second
    maxQueryLatency: 500, // milliseconds
    maxCpuUsage: 80, // percentage
    maxMemoryUsage: 85, // percentage
    maxEventLoopDelay: 100, // milliseconds
    minConnectionPoolAvailable: 5,
    slowQueryThreshold: 1000 // milliseconds
  };
  
  private thresholds: ScalabilityThresholds;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(prisma: PrismaClient, thresholds?: Partial<ScalabilityThresholds>) {
    this.prisma = prisma;
    this.thresholds = { ...this.defaultThresholds, ...thresholds };
  }

  static getInstance(prisma?: PrismaClient, thresholds?: Partial<ScalabilityThresholds>): ScalabilityMonitor {
    if (!ScalabilityMonitor.instance && prisma) {
      ScalabilityMonitor.instance = new ScalabilityMonitor(prisma, thresholds);
    }
    return ScalabilityMonitor.instance;
  }

  /**
   * Start scalability monitoring
   */
  startMonitoring(interval: number = 30000): void { // Default 30 seconds
    if (this.isMonitoring) {
      console.warn('Scalability monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting scalability monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.checkScalabilityAlerts();
        this.cleanupOldData();
      } catch (error) {
        console.error('Error during scalability monitoring:', error);
      }
    }, interval);
  }

  /**
   * Stop scalability monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('⏹️ Scalability monitoring stopped');
  }

  /**
   * Track user session start
   */
  trackUserSession(userId: string, role: string, ipAddress?: string): void {
    const now = Date.now();
    this.activeSessions.set(userId, {
      userId,
      sessionStart: now,
      lastActivity: now,
      permissionChecksCount: 0,
      role,
      ipAddress
    });
  }

  /**
   * Track user session activity
   */
  trackUserActivity(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Track permission check for user
   */
  trackPermissionCheck(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.permissionChecksCount++;
    }

    // Track concurrent permission checks
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentCount = this.activePermissionChecks.get(currentSecond.toString()) || 0;
    this.activePermissionChecks.set(currentSecond.toString(), currentCount + 1);

    // Clean up old permission check counts (keep last 60 seconds)
    const cutoff = currentSecond - 60;
    for (const [key] of this.activePermissionChecks) {
      if (parseInt(key) < cutoff) {
        this.activePermissionChecks.delete(key);
      }
    }
  }

  /**
   * Track database query performance
   */
  async trackDatabaseQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    parameters?: any[]
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await query();
      const duration = performance.now() - start;
      
      this.queryTimes.push(duration);
      
      // Track slow queries
      if (duration > this.thresholds.slowQueryThreshold) {
        this.slowQueries.push({
          query: queryName,
          duration,
          timestamp: Date.now(),
          parameters
        });
        
        // Keep only recent slow queries
        if (this.slowQueries.length > 100) {
          this.slowQueries = this.slowQueries.slice(-100);
        }
      }
      
      // Keep only recent query times for statistics
      if (this.queryTimes.length > 1000) {
        this.queryTimes = this.queryTimes.slice(-1000);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.queryTimes.push(duration);
      throw error;
    }
  }

  /**
   * Remove user session
   */
  removeUserSession(userId: string): void {
    this.activeSessions.delete(userId);
  }

  /**
   * Collect all metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    // Collect concurrent user metrics
    await this.collectConcurrentUserMetrics(timestamp);
    
    // Collect database performance metrics
    await this.collectDatabaseMetrics(timestamp);
    
    // Collect system resource metrics
    this.collectSystemMetrics(timestamp);
  }

  /**
   * Collect concurrent user metrics
   */
  private async collectConcurrentUserMetrics(timestamp: number): Promise<void> {
    const activeUsers = this.activeSessions.size;
    const now = Date.now();
    
    // Calculate concurrent permission checks (last 10 seconds)
    let concurrentPermissionChecks = 0;
    const currentSecond = Math.floor(now / 1000);
    for (let i = 0; i < 10; i++) {
      const second = (currentSecond - i).toString();
      concurrentPermissionChecks += this.activePermissionChecks.get(second) || 0;
    }

    // Calculate permission check rate (per second)
    const permissionCheckRate = concurrentPermissionChecks / 10;

    // Calculate peak concurrent users (from history)
    const peakConcurrentUsers = Math.max(
      activeUsers,
      ...this.concurrentUserMetrics.slice(-100).map(m => m.activeUsers)
    );

    // Calculate average session duration
    let totalSessionDuration = 0;
    let sessionCount = 0;
    for (const session of this.activeSessions.values()) {
      totalSessionDuration += now - session.sessionStart;
      sessionCount++;
    }
    const averageSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;

    const metrics: ConcurrentUserMetrics = {
      timestamp,
      activeUsers,
      concurrentPermissionChecks,
      peakConcurrentUsers,
      userSessions: new Map(this.activeSessions),
      permissionCheckRate,
      averageSessionDuration
    };

    this.concurrentUserMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.concurrentUserMetrics.length > this.maxMetricsHistory) {
      this.concurrentUserMetrics = this.concurrentUserMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Collect database performance metrics
   */
  private async collectDatabaseMetrics(timestamp: number): Promise<void> {
    try {
      // Get connection pool info (this is Prisma-specific)
      const poolInfo = await this.getConnectionPoolInfo();
      
      // Calculate query latency statistics
      const sortedQueryTimes = [...this.queryTimes].sort((a, b) => a - b);
      const queryLatency = {
        avg: sortedQueryTimes.length > 0 ? sortedQueryTimes.reduce((a, b) => a + b, 0) / sortedQueryTimes.length : 0,
        p50: sortedQueryTimes[Math.floor(sortedQueryTimes.length * 0.5)] || 0,
        p95: sortedQueryTimes[Math.floor(sortedQueryTimes.length * 0.95)] || 0,
        p99: sortedQueryTimes[Math.floor(sortedQueryTimes.length * 0.99)] || 0
      };

      // Calculate query throughput (queries per second over last minute)
      const oneMinuteAgo = timestamp - 60000;
      const recentQueries = this.queryTimes.length; // Simplified - would need timestamp tracking
      const queryThroughput = recentQueries / 60;

      const metrics: DatabasePerformanceMetrics = {
        timestamp,
        connectionPoolSize: poolInfo.size,
        activeConnections: poolInfo.active,
        idleConnections: poolInfo.idle,
        waitingConnections: poolInfo.waiting,
        queryLatency,
        slowQueries: [...this.slowQueries],
        queryThroughput,
        connectionErrors: 0, // Would need to track this
        deadlocks: 0 // Would need to track this
      };

      this.databaseMetrics.push(metrics);
      
      // Keep only recent metrics
      if (this.databaseMetrics.length > this.maxMetricsHistory) {
        this.databaseMetrics = this.databaseMetrics.slice(-this.maxMetricsHistory);
      }
    } catch (error) {
      console.error('Error collecting database metrics:', error);
    }
  }

  /**
   * Get connection pool information
   */
  private async getConnectionPoolInfo(): Promise<{
    size: number;
    active: number;
    idle: number;
    waiting: number;
  }> {
    // This is a simplified implementation
    // In a real scenario, you'd need to access Prisma's internal connection pool metrics
    return {
      size: 10, // Default pool size
      active: Math.floor(Math.random() * 8), // Simulated
      idle: Math.floor(Math.random() * 3), // Simulated
      waiting: Math.floor(Math.random() * 2) // Simulated
    };
  }

  /**
   * Collect system resource metrics
   */
  private collectSystemMetrics(timestamp: number): void {
    const memUsage = process.memoryUsage();
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;
    
    // Get CPU info
    const cpuCount = cpus().length;
    const loadAverages = loadavg();
    
    // Calculate CPU usage (simplified)
    const cpuUsage = Math.min(100, (loadAverages[0] / cpuCount) * 100);

    // Get event loop metrics (simplified)
    const eventLoopDelay = this.measureEventLoopDelay();

    const metrics: SystemResourceMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        loadAverage: loadAverages,
        cores: cpuCount
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        usage: (usedMem / totalMem) * 100
      },
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        limit: memUsage.external + memUsage.heapTotal, // Simplified
        usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      eventLoop: {
        delay: eventLoopDelay,
        utilization: Math.min(100, eventLoopDelay / 10) // Simplified calculation
      }
    };

    this.systemMetrics.push(metrics);
    
    // Keep only recent metrics
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Measure event loop delay
   */
  private measureEventLoopDelay(): number {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      return delay;
    });
    return 0; // Simplified - would need proper async measurement
  }

  /**
   * Check for scalability alerts
   */
  private checkScalabilityAlerts(): void {
    const now = Date.now();
    
    // Check latest metrics
    const latestUserMetrics = this.concurrentUserMetrics[this.concurrentUserMetrics.length - 1];
    const latestDbMetrics = this.databaseMetrics[this.databaseMetrics.length - 1];
    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];

    if (!latestUserMetrics || !latestDbMetrics || !latestSystemMetrics) return;

    // Check concurrent users
    if (latestUserMetrics.activeUsers > this.thresholds.maxConcurrentUsers) {
      this.addAlert({
        id: `concurrent-users-${now}`,
        type: 'HIGH_CONCURRENT_USERS',
        severity: latestUserMetrics.activeUsers > this.thresholds.maxConcurrentUsers * 1.2 ? 'CRITICAL' : 'HIGH',
        message: `High concurrent users: ${latestUserMetrics.activeUsers} (threshold: ${this.thresholds.maxConcurrentUsers})`,
        value: latestUserMetrics.activeUsers,
        threshold: this.thresholds.maxConcurrentUsers,
        timestamp: now,
        resolved: false
      });
    }

    // Check permission check rate
    if (latestUserMetrics.permissionCheckRate > this.thresholds.maxPermissionCheckRate) {
      this.addAlert({
        id: `permission-check-rate-${now}`,
        type: 'HIGH_CONCURRENT_USERS',
        severity: 'HIGH',
        message: `High permission check rate: ${latestUserMetrics.permissionCheckRate.toFixed(1)}/sec (threshold: ${this.thresholds.maxPermissionCheckRate})`,
        value: latestUserMetrics.permissionCheckRate,
        threshold: this.thresholds.maxPermissionCheckRate,
        timestamp: now,
        resolved: false
      });
    }

    // Check database query latency
    if (latestDbMetrics.queryLatency.avg > this.thresholds.maxQueryLatency) {
      this.addAlert({
        id: `query-latency-${now}`,
        type: 'DATABASE_OVERLOAD',
        severity: latestDbMetrics.queryLatency.avg > this.thresholds.maxQueryLatency * 2 ? 'CRITICAL' : 'HIGH',
        message: `High database query latency: ${latestDbMetrics.queryLatency.avg.toFixed(2)}ms (threshold: ${this.thresholds.maxQueryLatency}ms)`,
        value: latestDbMetrics.queryLatency.avg,
        threshold: this.thresholds.maxQueryLatency,
        timestamp: now,
        resolved: false
      });
    }

    // Check connection pool
    const availableConnections = latestDbMetrics.connectionPoolSize - latestDbMetrics.activeConnections;
    if (availableConnections < this.thresholds.minConnectionPoolAvailable) {
      this.addAlert({
        id: `connection-pool-${now}`,
        type: 'CONNECTION_POOL_EXHAUSTED',
        severity: availableConnections === 0 ? 'CRITICAL' : 'HIGH',
        message: `Low available database connections: ${availableConnections} (threshold: ${this.thresholds.minConnectionPoolAvailable})`,
        value: availableConnections,
        threshold: this.thresholds.minConnectionPoolAvailable,
        timestamp: now,
        resolved: false
      });
    }

    // Check CPU usage
    if (latestSystemMetrics.cpu.usage > this.thresholds.maxCpuUsage) {
      this.addAlert({
        id: `cpu-usage-${now}`,
        type: 'HIGH_CPU_USAGE',
        severity: latestSystemMetrics.cpu.usage > this.thresholds.maxCpuUsage * 1.1 ? 'CRITICAL' : 'HIGH',
        message: `High CPU usage: ${latestSystemMetrics.cpu.usage.toFixed(1)}% (threshold: ${this.thresholds.maxCpuUsage}%)`,
        value: latestSystemMetrics.cpu.usage,
        threshold: this.thresholds.maxCpuUsage,
        timestamp: now,
        resolved: false
      });
    }

    // Check memory usage
    if (latestSystemMetrics.memory.usage > this.thresholds.maxMemoryUsage) {
      this.addAlert({
        id: `memory-usage-${now}`,
        type: 'HIGH_MEMORY_USAGE',
        severity: latestSystemMetrics.memory.usage > this.thresholds.maxMemoryUsage * 1.1 ? 'CRITICAL' : 'HIGH',
        message: `High memory usage: ${latestSystemMetrics.memory.usage.toFixed(1)}% (threshold: ${this.thresholds.maxMemoryUsage}%)`,
        value: latestSystemMetrics.memory.usage,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: now,
        resolved: false
      });
    }

    // Check slow queries
    if (latestDbMetrics.slowQueries.length > 0) {
      const recentSlowQueries = latestDbMetrics.slowQueries.filter(q => q.timestamp > now - 300000); // Last 5 minutes
      if (recentSlowQueries.length > 5) {
        this.addAlert({
          id: `slow-queries-${now}`,
          type: 'SLOW_QUERIES',
          severity: 'MEDIUM',
          message: `Multiple slow queries detected: ${recentSlowQueries.length} in last 5 minutes`,
          value: recentSlowQueries.length,
          threshold: 5,
          timestamp: now,
          resolved: false,
          metadata: { slowQueries: recentSlowQueries.slice(0, 5) }
        });
      }
    }
  }

  /**
   * Add scalability alert
   */
  private addAlert(alert: ScalabilityAlert): void {
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }

    // Log critical alerts
    if (alert.severity === 'CRITICAL') {
      console.error(`🚨 CRITICAL Scalability Alert: ${alert.message}`);
    } else if (alert.severity === 'HIGH') {
      console.warn(`⚠️ HIGH Scalability Alert: ${alert.message}`);
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old sessions (inactive for more than 1 hour)
    const sessionTimeout = 60 * 60 * 1000; // 1 hour
    for (const [userId, session] of this.activeSessions) {
      if (now - session.lastActivity > sessionTimeout) {
        this.activeSessions.delete(userId);
      }
    }
    
    // Clean up old query times
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }
    
    // Clean up old slow queries
    this.slowQueries = this.slowQueries.filter(q => now - q.timestamp < maxAge);
  }

  /**
   * Get concurrent user metrics
   */
  getConcurrentUserMetrics(timeWindow?: number): ConcurrentUserMetrics[] {
    if (!timeWindow) return [...this.concurrentUserMetrics];
    
    const cutoff = Date.now() - timeWindow;
    return this.concurrentUserMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get database performance metrics
   */
  getDatabaseMetrics(timeWindow?: number): DatabasePerformanceMetrics[] {
    if (!timeWindow) return [...this.databaseMetrics];
    
    const cutoff = Date.now() - timeWindow;
    return this.databaseMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get system resource metrics
   */
  getSystemMetrics(timeWindow?: number): SystemResourceMetrics[] {
    if (!timeWindow) return [...this.systemMetrics];
    
    const cutoff = Date.now() - timeWindow;
    return this.systemMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get scalability alerts
   */
  getAlerts(severity?: ScalabilityAlert['severity'], resolved?: boolean): ScalabilityAlert[] {
    return this.alerts.filter(alert => {
      if (severity && alert.severity !== severity) return false;
      if (resolved !== undefined && alert.resolved !== resolved) return false;
      return true;
    });
  }

  /**
   * Get comprehensive scalability report
   */
  getScalabilityReport(timeWindow: number = 24 * 60 * 60 * 1000): {
    summary: {
      peakConcurrentUsers: number;
      averageUsers: number;
      totalPermissionChecks: number;
      averageQueryLatency: number;
      peakCpuUsage: number;
      peakMemoryUsage: number;
    };
    userMetrics: ConcurrentUserMetrics[];
    databaseMetrics: DatabasePerformanceMetrics[];
    systemMetrics: SystemResourceMetrics[];
    alerts: ScalabilityAlert[];
    recommendations: Array<{
      type: 'scaling' | 'optimization' | 'infrastructure';
      priority: 'low' | 'medium' | 'high';
      description: string;
      impact: string;
      implementation: string;
    }>;
  } {
    const userMetrics = this.getConcurrentUserMetrics(timeWindow);
    const databaseMetrics = this.getDatabaseMetrics(timeWindow);
    const systemMetrics = this.getSystemMetrics(timeWindow);
    const alerts = this.getAlerts(undefined, false);

    // Calculate summary statistics
    const peakConcurrentUsers = Math.max(...userMetrics.map(m => m.activeUsers), 0);
    const averageUsers = userMetrics.length > 0 
      ? userMetrics.reduce((sum, m) => sum + m.activeUsers, 0) / userMetrics.length 
      : 0;
    
    const totalPermissionChecks = userMetrics.reduce((sum, m) => sum + m.concurrentPermissionChecks, 0);
    
    const averageQueryLatency = databaseMetrics.length > 0
      ? databaseMetrics.reduce((sum, m) => sum + m.queryLatency.avg, 0) / databaseMetrics.length
      : 0;
    
    const peakCpuUsage = Math.max(...systemMetrics.map(m => m.cpu.usage), 0);
    const peakMemoryUsage = Math.max(...systemMetrics.map(m => m.memory.usage), 0);

    // Generate recommendations
    const recommendations: Array<{
      type: 'scaling' | 'optimization' | 'infrastructure';
      priority: 'low' | 'medium' | 'high';
      description: string;
      impact: string;
      implementation: string;
    }> = [];

    if (peakConcurrentUsers > this.thresholds.maxConcurrentUsers * 0.8) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        description: `Peak concurrent users (${peakConcurrentUsers}) approaching limit`,
        impact: 'System may become unresponsive under higher load',
        implementation: 'Consider horizontal scaling or load balancing'
      });
    }

    if (averageQueryLatency > this.thresholds.maxQueryLatency * 0.7) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: `Database query latency averaging ${averageQueryLatency.toFixed(2)}ms`,
        impact: 'Slower response times and reduced throughput',
        implementation: 'Optimize queries, add indexes, or scale database'
      });
    }

    if (peakCpuUsage > this.thresholds.maxCpuUsage * 0.8) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'medium',
        description: `CPU usage peaked at ${peakCpuUsage.toFixed(1)}%`,
        impact: 'Potential performance degradation under load',
        implementation: 'Scale up CPU resources or optimize CPU-intensive operations'
      });
    }

    return {
      summary: {
        peakConcurrentUsers,
        averageUsers,
        totalPermissionChecks,
        averageQueryLatency,
        peakCpuUsage,
        peakMemoryUsage
      },
      userMetrics,
      databaseMetrics,
      systemMetrics,
      alerts,
      recommendations
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<ScalabilityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      concurrentUserMetrics: this.concurrentUserMetrics,
      databaseMetrics: this.databaseMetrics,
      systemMetrics: this.systemMetrics,
      alerts: this.alerts,
      thresholds: this.thresholds
    };

    if (format === 'csv') {
      // Simplified CSV export - would need more complex implementation for full data
      const headers = ['timestamp', 'activeUsers', 'queryLatency', 'cpuUsage', 'memoryUsage'];
      const rows = this.concurrentUserMetrics.map((userMetric, index) => {
        const dbMetric = this.databaseMetrics[index];
        const sysMetric = this.systemMetrics[index];
        return [
          userMetric.timestamp,
          userMetric.activeUsers,
          dbMetric?.queryLatency.avg || 0,
          sysMetric?.cpu.usage || 0,
          sysMetric?.memory.usage || 0
        ];
      });
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
let scalabilityMonitorInstance: ScalabilityMonitor;

export function getScalabilityMonitor(prisma?: PrismaClient, thresholds?: Partial<ScalabilityThresholds>): ScalabilityMonitor {
  if (!scalabilityMonitorInstance && prisma) {
    scalabilityMonitorInstance = ScalabilityMonitor.getInstance(prisma, thresholds);
  }
  return scalabilityMonitorInstance;
}

// ScalabilityMonitor class is already exported above