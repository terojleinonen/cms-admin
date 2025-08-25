/**
 * Analytics Service
 * Handles analytics data collection and reporting
 */

import { prisma } from '@/lib/db';

interface TimeframeData {
  startDate: Date;
  endDate: Date;
  days: number;
}

interface DashboardMetrics {
  totalProducts: number;
  totalPages: number;
  totalMedia: number;
  totalUsers: number;
  publishedContent: number;
  draftContent: number;
  recentActivity: number;
  storageUsed: number;
}

interface ContentPerformanceItem {
  id: string;
  title: string;
  type: 'product' | 'page';
  status: string;
  views: number;
  lastModified: Date;
  creator: string;
}

interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  status: 'low_stock' | 'out_of_stock';
  lastUpdated: Date;
}

interface ActivityItem {
  action: string;
  contentType: string;
  contentTitle: string;
  userName: string;
  timestamp: Date;
}

interface ContentTrends {
  contentCreation: Array<{
    date: Date;
    products: number;
    pages: number;
  }>;
  userActivity: Array<{
    date: Date;
    revisions: number;
  }>;
}

interface StorageGrowth {
  date: Date;
  totalSize: number;
  fileCount: number;
}

interface ComprehensiveReport {
  metrics: DashboardMetrics;
  contentPerformance: ContentPerformanceItem[];
  inventoryAlerts: InventoryAlert[];
  recentActivity: ActivityItem[];
  trends: ContentTrends & { storageGrowth: StorageGrowth[] };
  generatedAt: Date;
  timeframe: string;
}

export class AnalyticsService {
  /**
   * Get timeframe data for date filtering
   */
  static getTimeframe(timeframe: string): TimeframeData {
    const endDate = new Date();
    const startDate = new Date();
    let days: number;

    switch (timeframe) {
      case '7d':
        days = 7;
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        days = 30;
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        days = 90;
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        days = 365;
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        days = 30;
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate, days };
  }

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      totalProducts,
      totalPages,
      totalMedia,
      totalUsers,
      publishedProducts,
      publishedPages,
      draftProducts,
      draftPages,
      recentProducts,
      recentPages,
      mediaFiles
    ] = await Promise.all([
      prisma.product.count(),
      prisma.page.count(),
      prisma.media.count(),
      prisma.user.count(),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      prisma.page.count({ where: { status: 'PUBLISHED' } }),
      prisma.product.count({ where: { status: 'DRAFT' } }),
      prisma.page.count({ where: { status: 'DRAFT' } }),
      prisma.product.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.page.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.media.findMany({
        select: { fileSize: true }
      })
    ]);

    const storageUsed = mediaFiles.reduce((total, file) => total + file.fileSize, 0);

    return {
      totalProducts,
      totalPages,
      totalMedia,
      totalUsers,
      publishedContent: publishedProducts + publishedPages,
      draftContent: draftProducts + draftPages,
      recentActivity: recentProducts + recentPages,
      storageUsed
    };
  }

  /**
   * Get content performance data
   */
  static async getContentPerformance(
    limit: number,
    timeframeData: TimeframeData
  ): Promise<ContentPerformanceItem[]> {
    const [products, pages] = await Promise.all([
      prisma.product.findMany({
        where: {
          updatedAt: {
            gte: timeframeData.startDate,
            lte: timeframeData.endDate
          }
        },
        include: {
          creator: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: Math.ceil(limit / 2)
      }),
      prisma.page.findMany({
        where: {
          updatedAt: {
            gte: timeframeData.startDate,
            lte: timeframeData.endDate
          }
        },
        include: {
          creator: {
            select: { name: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: Math.ceil(limit / 2)
      })
    ]);

    const performance: ContentPerformanceItem[] = [];

    // Add products
    products.forEach(product => {
      performance.push({
        id: product.id,
        title: product.name,
        type: 'product',
        status: product.status,
        views: Math.floor(Math.random() * 1000), // Placeholder for actual view tracking
        lastModified: product.updatedAt,
        creator: product.creator.name
      });
    });

    // Add pages
    pages.forEach(page => {
      performance.push({
        id: page.id,
        title: page.title,
        type: 'page',
        status: page.status,
        views: Math.floor(Math.random() * 500), // Placeholder for actual view tracking
        lastModified: page.updatedAt,
        creator: page.creator.name
      });
    });

    // Sort by views and return top items
    return performance
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Get inventory alerts
   */
  static async getInventoryAlerts(): Promise<InventoryAlert[]> {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        OR: [
          { inventoryQuantity: { lte: 10, gt: 0 } }, // Low stock
          { inventoryQuantity: 0 } // Out of stock
        ]
      },
      select: {
        id: true,
        name: true,
        inventoryQuantity: true,
        updatedAt: true
      },
      orderBy: { inventoryQuantity: 'asc' }
    });

    return lowStockProducts.map(product => ({
      productId: product.id,
      productName: product.name,
      currentStock: product.inventoryQuantity,
      status: product.inventoryQuantity === 0 ? 'out_of_stock' as const : 'low_stock' as const,
      lastUpdated: product.updatedAt
    }));
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit: number): Promise<ActivityItem[]> {
    const revisions = await prisma.contentRevision.findMany({
      include: {
        creator: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const activities: ActivityItem[] = [];

    for (const revision of revisions) {
      let contentTitle = 'Unknown';
      
      // Get content title based on type
      if (revision.contentType === 'product') {
        const product = await prisma.product.findUnique({
          where: { id: revision.contentId },
          select: { name: true }
        });
        contentTitle = product?.name || 'Unknown Product';
      } else if (revision.contentType === 'page') {
        const page = await prisma.page.findUnique({
          where: { id: revision.contentId },
          select: { title: true }
        });
        contentTitle = page?.title || 'Unknown Page';
      }

      activities.push({
        action: (revision.revisionData as any)?.action || 'Content updated',
        contentType: revision.contentType,
        contentTitle,
        userName: revision.creator.name,
        timestamp: revision.createdAt
      });
    }

    return activities;
  }

  /**
   * Get content trends
   */
  static async getContentTrends(timeframeData: TimeframeData): Promise<ContentTrends> {
    const contentCreation: Array<{ date: Date; products: number; pages: number }> = [];
    const userActivity: Array<{ date: Date; revisions: number }> = [];

    // Generate daily data for the timeframe
    for (let i = 0; i < timeframeData.days; i++) {
      const date = new Date(timeframeData.startDate);
      date.setDate(date.getDate() + i);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [productCount, pageCount, revisionCount] = await Promise.all([
        prisma.product.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        }),
        prisma.page.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        }),
        prisma.contentRevision.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate
            }
          }
        })
      ]);

      contentCreation.push({
        date,
        products: productCount,
        pages: pageCount
      });

      userActivity.push({
        date,
        revisions: revisionCount
      });
    }

    return {
      contentCreation,
      userActivity
    };
  }

  /**
   * Get storage growth data
   */
  static async getStorageGrowth(timeframeData: TimeframeData): Promise<StorageGrowth[]> {
    const storageGrowth: StorageGrowth[] = [];

    for (let i = 0; i < timeframeData.days; i++) {
      const date = new Date(timeframeData.startDate);
      date.setDate(date.getDate() + i);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const mediaFiles = await prisma.media.findMany({
        where: {
          createdAt: {
            gte: timeframeData.startDate,
            lt: nextDate
          }
        },
        select: { fileSize: true }
      });

      const totalSize = mediaFiles.reduce((total, file) => total + file.fileSize, 0);

      storageGrowth.push({
        date,
        totalSize,
        fileCount: mediaFiles.length
      });
    }

    return storageGrowth;
  }

  /**
   * Generate comprehensive report
   */
  static async generateReport(timeframeData: TimeframeData): Promise<ComprehensiveReport> {
    const [
      metrics,
      contentPerformance,
      inventoryAlerts,
      recentActivity,
      trends,
      storageGrowth
    ] = await Promise.all([
      this.getDashboardMetrics(),
      this.getContentPerformance(20, timeframeData),
      this.getInventoryAlerts(),
      this.getRecentActivity(50),
      this.getContentTrends(timeframeData),
      this.getStorageGrowth(timeframeData)
    ]);

    return {
      metrics,
      contentPerformance,
      inventoryAlerts,
      recentActivity,
      trends: {
        ...trends,
        storageGrowth
      },
      generatedAt: new Date(),
      timeframe: `${timeframeData.days}d`
    };
  }

  /**
   * Export report data to CSV format
   */
  static async exportToCSV(reportData: ComprehensiveReport): Promise<string> {
    let csv = '';

    // Dashboard Metrics Section
    csv += 'DASHBOARD METRICS\n';
    csv += 'Metric,Value\n';
    csv += `Total Products,${reportData.metrics.totalProducts}\n`;
    csv += `Total Pages,${reportData.metrics.totalPages}\n`;
    csv += `Total Media,${reportData.metrics.totalMedia}\n`;
    csv += `Total Users,${reportData.metrics.totalUsers}\n`;
    csv += `Published Content,${reportData.metrics.publishedContent}\n`;
    csv += `Draft Content,${reportData.metrics.draftContent}\n`;
    csv += `Recent Activity,${reportData.metrics.recentActivity}\n`;
    csv += `Storage Used (bytes),${reportData.metrics.storageUsed}\n`;
    csv += '\n';

    // Content Performance Section
    csv += 'CONTENT PERFORMANCE\n';
    csv += 'ID,Title,Type,Status,Views,Last Modified,Creator\n';
    reportData.contentPerformance.forEach(item => {
      const lastModified = item.lastModified ? item.lastModified.toISOString() : 'N/A';
      csv += `${item.id},"${item.title}",${item.type},${item.status},${item.views},${lastModified},"${item.creator}"\n`;
    });
    csv += '\n';

    // Inventory Alerts Section
    csv += 'INVENTORY ALERTS\n';
    csv += 'Product ID,Product Name,Current Stock,Status,Last Updated\n';
    reportData.inventoryAlerts.forEach(alert => {
      const lastUpdated = alert.lastUpdated ? alert.lastUpdated.toISOString() : 'N/A';
      csv += `${alert.productId},"${alert.productName}",${alert.currentStock},${alert.status},${lastUpdated}\n`;
    });
    csv += '\n';

    // Recent Activity Section
    csv += 'RECENT ACTIVITY\n';
    csv += 'Action,Content Type,Content Title,User Name,Timestamp\n';
    reportData.recentActivity.forEach(activity => {
      const timestamp = activity.timestamp ? activity.timestamp.toISOString() : 'N/A';
      csv += `"${activity.action}",${activity.contentType},"${activity.contentTitle}","${activity.userName}",${timestamp}\n`;
    });
    csv += '\n';

    // Content Creation Trends
    csv += 'CONTENT CREATION TRENDS\n';
    csv += 'Date,Products Created,Pages Created\n';
    reportData.trends.contentCreation.forEach(trend => {
      csv += `${trend.date.toISOString().split('T')[0]},${trend.products},${trend.pages}\n`;
    });
    csv += '\n';

    // User Activity Trends
    csv += 'USER ACTIVITY TRENDS\n';
    csv += 'Date,Revisions\n';
    reportData.trends.userActivity.forEach(activity => {
      csv += `${activity.date.toISOString().split('T')[0]},${activity.revisions}\n`;
    });
    csv += '\n';

    // Storage Growth
    csv += 'STORAGE GROWTH\n';
    csv += 'Date,Total Size (bytes),File Count\n';
    reportData.trends.storageGrowth.forEach(storage => {
      csv += `${storage.date.toISOString().split('T')[0]},${storage.totalSize},${storage.fileCount}\n`;
    });

    return csv;
  }
}