/**
 * Scalability Monitoring Middleware Integration
 * Automatically tracks user sessions, permission checks, and database queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getScalabilityMonitor } from './scalability-monitor';
import { prisma } from './db';

/**
 * Middleware wrapper for scalability monitoring
 */
export function withScalabilityMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const scalabilityMonitor = getScalabilityMonitor(prisma);
    const startTime = performance.now();
    
    try {
      // Get user token for session tracking
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      
      if (token?.sub) {
        // Track user activity
        scalabilityMonitor.trackUserActivity(token.sub);
        
        // Track permission check (if this is a protected route)
        if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api')) {
          scalabilityMonitor.trackPermissionCheck(token.sub);
        }
      }
      
      // Execute the original handler
      const response = await handler(req);
      
      // Track request completion time
      const duration = performance.now() - startTime;
      
      // Log slow requests (over 1 second)
      if (duration > 1000) {
        console.warn(`Slow request detected: ${req.nextUrl.pathname} took ${duration.toFixed(2)}ms`);
      }
      
      return response;
      
    } catch (error) {
      // Track error and re-throw
      const duration = performance.now() - startTime;
      console.error(`Request error in ${req.nextUrl.pathname} after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

/**
 * Session tracking utilities for authentication events
 */
export class SessionTracker {
  private static scalabilityMonitor = getScalabilityMonitor(prisma);

  /**
   * Track user login
   */
  static trackLogin(userId: string, role: string, ipAddress?: string): void {
    this.scalabilityMonitor.trackUserSession(userId, role, ipAddress);
    console.log(`User session started: ${userId} (${role})`);
  }

  /**
   * Track user logout
   */
  static trackLogout(userId: string): void {
    this.scalabilityMonitor.removeUserSession(userId);
    console.log(`User session ended: ${userId}`);
  }

  /**
   * Track user activity
   */
  static trackActivity(userId: string): void {
    this.scalabilityMonitor.trackUserActivity(userId);
  }

  /**
   * Track permission check
   */
  static trackPermissionCheck(userId: string): void {
    this.scalabilityMonitor.trackPermissionCheck(userId);
  }
}

/**
 * Database query tracking wrapper
 */
export function withDatabaseTracking<T>(
  queryName: string,
  query: () => Promise<T>,
  parameters?: any[]
): Promise<T> {
  const scalabilityMonitor = getScalabilityMonitor(prisma);
  return scalabilityMonitor.trackDatabaseQuery(queryName, query, parameters);
}

/**
 * API route wrapper for automatic scalability monitoring
 */
export function withScalabilityAPI(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const scalabilityMonitor = getScalabilityMonitor(prisma);
    const startTime = performance.now();
    
    try {
      // Get user information from token
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      
      if (token?.sub) {
        // Track API usage
        scalabilityMonitor.trackUserActivity(token.sub);
        scalabilityMonitor.trackPermissionCheck(token.sub);
      }
      
      // Execute handler with database tracking
      const response = await withDatabaseTracking(
        `API:${req.nextUrl.pathname}`,
        () => handler(req)
      );
      
      const duration = performance.now() - startTime;
      
      // Log API performance
      if (duration > 500) { // Log slow API calls
        console.warn(`Slow API call: ${req.method} ${req.nextUrl.pathname} took ${duration.toFixed(2)}ms`);
      }
      
      return response;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`API error in ${req.method} ${req.nextUrl.pathname} after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

/**
 * React hook for client-side activity tracking
 */
export function useScalabilityTracking() {
  const trackActivity = async () => {
    try {
      await fetch('/api/admin/monitoring/concurrent-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activity' })
      });
    } catch (error) {
      // Silently fail - monitoring shouldn't break the app
      console.debug('Failed to track user activity:', error);
    }
  };

  const trackPermissionCheck = async () => {
    try {
      await fetch('/api/admin/monitoring/concurrent-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'permissionCheck' })
      });
    } catch (error) {
      // Silently fail - monitoring shouldn't break the app
      console.debug('Failed to track permission check:', error);
    }
  };

  return {
    trackActivity,
    trackPermissionCheck
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceTracker {
  private static measurements: Map<string, number> = new Map();

  /**
   * Start measuring performance
   */
  static start(label: string): void {
    this.measurements.set(label, performance.now());
  }

  /**
   * End measurement and log if slow
   */
  static end(label: string, threshold: number = 100): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`Performance measurement '${label}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(label);

    if (duration > threshold) {
      console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure async operation
   */
  static async measure<T>(
    label: string,
    operation: () => Promise<T>,
    threshold: number = 100
  ): Promise<T> {
    this.start(label);
    try {
      const result = await operation();
      this.end(label, threshold);
      return result;
    } catch (error) {
      this.end(label, threshold);
      throw error;
    }
  }
}

/**
 * Memory monitoring utilities
 */
export class MemoryTracker {
  /**
   * Get current memory usage
   */
  static getCurrentUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Log memory usage with label
   */
  static logUsage(label: string): void {
    const usage = this.getCurrentUsage();
    console.log(`Memory usage [${label}]:`, {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    });
  }

  /**
   * Check if memory usage is high
   */
  static isMemoryHigh(threshold: number = 0.8): boolean {
    const usage = this.getCurrentUsage();
    return (usage.heapUsed / usage.heapTotal) > threshold;
  }

  /**
   * Trigger garbage collection if available and memory is high
   */
  static triggerGCIfNeeded(threshold: number = 0.8): boolean {
    if (this.isMemoryHigh(threshold) && global.gc) {
      console.log('High memory usage detected, triggering garbage collection');
      global.gc();
      return true;
    }
    return false;
  }
}

/**
 * Initialize scalability monitoring
 */
export function initializeScalabilityMonitoring(): void {
  const scalabilityMonitor = getScalabilityMonitor(prisma);
  
  // Start monitoring with 30-second intervals
  scalabilityMonitor.startMonitoring(30000);
  
  console.log('🔍 Scalability monitoring initialized');
  
  // Set up periodic memory checks
  setInterval(() => {
    MemoryTracker.triggerGCIfNeeded(0.85);
  }, 60000); // Check every minute
  
  // Log system status every 5 minutes
  setInterval(() => {
    const report = scalabilityMonitor.getScalabilityReport(300000); // Last 5 minutes
    console.log('📊 Scalability Status:', {
      activeUsers: report.summary.peakConcurrentUsers,
      avgQueryLatency: `${report.summary.averageQueryLatency.toFixed(2)}ms`,
      cpuUsage: `${report.summary.peakCpuUsage.toFixed(1)}%`,
      memoryUsage: `${report.summary.peakMemoryUsage.toFixed(1)}%`,
      alerts: report.alerts.length
    });
  }, 300000); // Every 5 minutes
}

// Functions and classes are already exported individually above