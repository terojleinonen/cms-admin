/**
 * Workflow Service
 * Handles content workflow and approval processes
 */

import { prisma } from './db'
import { Prisma, ProductStatus, PageStatus, ContentRevision } from '@prisma/client'

export type WorkflowStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'
export type ContentType = 'product' | 'page' | 'category'

export interface WorkflowAction {
  id?: string
  contentType: ContentType
  contentId: string
  action: 'submit_for_review' | 'approve' | 'reject' | 'publish' | 'archive' | 'schedule'
  userId: string
  comment?: string
  scheduledFor?: Date
}

export interface ContentWorkflowData {
  id: string
  title: string
  status: WorkflowStatus
  contentType: ContentType
  createdBy: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  creator: {
    name: string
    email: string
  }
}

export interface WorkflowNotification {
  id: string
  type: 'workflow_action' | 'status_change' | 'approval_request'
  contentType: ContentType
  contentId: string
  contentTitle: string
  action: string
  userId: string
  targetUserId?: string
  message: string
  createdAt: Date
  read: boolean
}

export interface WorkflowStats {
  totalContent: number
  draftContent: number
  reviewContent: number
  publishedContent: number
  archivedContent: number
  pendingApprovals: number
}

export class WorkflowService {
  /**
   * Get content pending review
   */
  static async getContentPendingReview(userId?: string): Promise<ContentWorkflowData[]> {
    try {
      const [products, pages] = await Promise.all([
        // Get products in review status
        prisma.product.findMany({
          where: {
            status: ProductStatus.DRAFT,
            ...(userId && { createdBy: userId })
          },
          include: {
            creator: {
              select: { name: true, email: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        // Get pages in review status
        prisma.page.findMany({
          where: {
            status: PageStatus.REVIEW,
            ...(userId && { createdBy: userId })
          },
          include: {
            creator: {
              select: { name: true, email: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        })
      ])

      const contentData: ContentWorkflowData[] = [
        ...products.map(product => ({
          id: product.id,
          title: product.name,
          status: product.status as WorkflowStatus,
          contentType: 'product' as ContentType,
          createdBy: product.createdBy,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          creator: product.creator
        })),
        ...pages.map(page => ({
          id: page.id,
          title: page.title,
          status: page.status as WorkflowStatus,
          contentType: 'page' as ContentType,
          createdBy: page.createdBy,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          publishedAt: page.publishedAt || undefined,
          creator: page.creator
        }))
      ]

      return contentData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    } catch (error) {
      console.error('Error fetching content pending review:', error)
      throw new Error('Failed to fetch content pending review')
    }
  }

  /**
   * Execute workflow action
   */
  static async executeWorkflowAction(action: WorkflowAction): Promise<boolean> {
    try {
      // Create revision before making changes
      await this.createContentRevision(action.contentType, action.contentId, action.userId)

      // Execute the workflow action based on content type
      if (action.contentType === 'product') {
        await this.executeProductWorkflowAction(action)
      } else if (action.contentType === 'page') {
        await this.executePageWorkflowAction(action)
      }

      // Create notification for workflow action
      await this.createWorkflowNotification(action)

      return true
    } catch (error) {
      console.error('Error executing workflow action:', error)
      throw new Error('Failed to execute workflow action')
    }
  }

  /**
   * Execute product workflow action
   */
  private static async executeProductWorkflowAction(action: WorkflowAction): Promise<void> {
    const statusMap: Record<string, ProductStatus> = {
      'submit_for_review': ProductStatus.DRAFT,
      'approve': ProductStatus.PUBLISHED,
      'reject': ProductStatus.DRAFT,
      'publish': ProductStatus.PUBLISHED,
      'archive': ProductStatus.ARCHIVED
    }

    const newStatus = statusMap[action.action]
    if (!newStatus) {
      throw new Error(`Invalid action for product: ${action.action}`)
    }

    await prisma.product.update({
      where: { id: action.contentId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Execute page workflow action
   */
  private static async executePageWorkflowAction(action: WorkflowAction): Promise<void> {
    const statusMap: Record<string, PageStatus> = {
      'submit_for_review': PageStatus.REVIEW,
      'approve': PageStatus.PUBLISHED,
      'reject': PageStatus.DRAFT,
      'publish': PageStatus.PUBLISHED,
      'archive': PageStatus.ARCHIVED
    }

    const newStatus = statusMap[action.action]
    if (!newStatus) {
      throw new Error(`Invalid action for page: ${action.action}`)
    }

    const updateData: Prisma.PageUpdateInput = {
      status: newStatus,
      updatedAt: new Date()
    }

    // Set publishedAt when publishing
    if (action.action === 'publish' || action.action === 'approve') {
      updateData.publishedAt = action.scheduledFor || new Date()
    }

    await prisma.page.update({
      where: { id: action.contentId },
      data: updateData
    })
  }

  /**
   * Create content revision
   */
  private static async createContentRevision(
    contentType: ContentType, 
    contentId: string, 
    userId: string
  ): Promise<void> {
    let revisionData: unknown = {}

    if (contentType === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: contentId },
        include: { categories: true, media: true }
      })
      revisionData = product
    } else if (contentType === 'page') {
      const page = await prisma.page.findUnique({
        where: { id: contentId }
      })
      revisionData = page
    }

    if (revisionData) {
      await prisma.contentRevision.create({
        data: {
          contentType,
          contentId,
          revisionData: revisionData as Prisma.InputJsonValue,
          createdBy: userId
        }
      })
    }
  }

  /**
   * Create workflow notification
   */
  private static async createWorkflowNotification(action: WorkflowAction): Promise<void> {
    // In a real implementation, this would create notifications in a notifications table
    // For now, we'll just log the notification
    console.log('Workflow notification created:', {
      type: 'workflow_action',
      contentType: action.contentType,
      contentId: action.contentId,
      action: action.action,
      userId: action.userId,
      message: `${action.action} performed on ${action.contentType} ${action.contentId}`,
      createdAt: new Date()
    })
  }

  /**
   * Get content revisions
   */
  static async getContentRevisions(contentType: ContentType, contentId: string): Promise<ContentRevision[]> {
    try {
      const revisions = await prisma.contentRevision.findMany({
        where: {
          contentType,
          contentId
        },
        include: {
          creator: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return revisions
    } catch (error) {
      console.error('Error fetching content revisions:', error)
      throw new Error('Failed to fetch content revisions')
    }
  }

  /**
   * Get workflow statistics
   */
  static async getWorkflowStats(): Promise<WorkflowStats> {
    try {
      const [productStats, pageStats] = await Promise.all([
        prisma.product.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        prisma.page.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ])

      const stats: WorkflowStats = {
        totalContent: 0,
        draftContent: 0,
        reviewContent: 0,
        publishedContent: 0,
        archivedContent: 0,
        pendingApprovals: 0
      }

      // Process product stats
      productStats.forEach(stat => {
        stats.totalContent += stat._count.status
        switch (stat.status) {
          case ProductStatus.DRAFT:
            stats.draftContent += stat._count.status
            break
          case ProductStatus.PUBLISHED:
            stats.publishedContent += stat._count.status
            break
          case ProductStatus.ARCHIVED:
            stats.archivedContent += stat._count.status
            break
        }
      })

      // Process page stats
      pageStats.forEach(stat => {
        stats.totalContent += stat._count.status
        switch (stat.status) {
          case PageStatus.DRAFT:
            stats.draftContent += stat._count.status
            break
          case PageStatus.REVIEW:
            stats.reviewContent += stat._count.status
            stats.pendingApprovals += stat._count.status
            break
          case PageStatus.PUBLISHED:
            stats.publishedContent += stat._count.status
            break
          case PageStatus.ARCHIVED:
            stats.archivedContent += stat._count.status
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Error fetching workflow stats:', error)
      throw new Error('Failed to fetch workflow stats')
    }
  }

  /**
   * Get content by status
   */
  static async getContentByStatus(status: WorkflowStatus, userId?: string): Promise<ContentWorkflowData[]> {
    try {
      const [products, pages] = await Promise.all([
        // Get products by status
        prisma.product.findMany({
          where: {
            status: status as ProductStatus,
            ...(userId && { createdBy: userId })
          },
          include: {
            creator: {
              select: { name: true, email: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        // Get pages by status
        prisma.page.findMany({
          where: {
            status: status as PageStatus,
            ...(userId && { createdBy: userId })
          },
          include: {
            creator: {
              select: { name: true, email: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        })
      ])

      const contentData: ContentWorkflowData[] = [
        ...products.map(product => ({
          id: product.id,
          title: product.name,
          status: product.status as WorkflowStatus,
          contentType: 'product' as ContentType,
          createdBy: product.createdBy,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          creator: product.creator
        })),
        ...pages.map(page => ({
          id: page.id,
          title: page.title,
          status: page.status as WorkflowStatus,
          contentType: 'page' as ContentType,
          createdBy: page.createdBy,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          publishedAt: page.publishedAt || undefined,
          creator: page.creator
        }))
      ]

      return contentData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    } catch (error) {
      console.error('Error fetching content by status:', error)
      throw new Error('Failed to fetch content by status')
    }
  }
}