import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and EDITOR can access dashboard analytics
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.EDITOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get dashboard analytics data
    const [
      totalProducts,
      totalCategories,
      totalUsers,
      totalMedia,
      recentProducts,
      recentUsers
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.media.count(),
      prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      })
    ])

    const dashboardData = {
      overview: {
        totalProducts,
        totalCategories,
        totalUsers,
        totalMedia
      },
      recentActivity: {
        products: recentProducts,
        users: recentUsers
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}