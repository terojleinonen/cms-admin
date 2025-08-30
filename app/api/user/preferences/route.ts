/**
 * User Preferences API Route
 * Handles fetching and updating user preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDefaultPreferences, validateAndMigratePreferences } from '@/lib/preferences-middleware'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select: {
        theme: true,
        timezone: true,
        language: true,
        notifications: true,
        dashboard: true,
      }
    })

    if (!preferences) {
      // Create default preferences for new user
      const defaultPrefs = getDefaultPreferences()
      const newPreferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
          theme: defaultPrefs.theme,
          timezone: defaultPrefs.timezone,
          language: defaultPrefs.language,
          notifications: defaultPrefs.notifications,
          dashboard: defaultPrefs.dashboard,
        }
      })

      return NextResponse.json({
        theme: newPreferences.theme,
        timezone: newPreferences.timezone,
        language: newPreferences.language,
        notifications: newPreferences.notifications,
        dashboard: newPreferences.dashboard,
      })
    }

    return NextResponse.json({
      theme: preferences.theme,
      timezone: preferences.timezone,
      language: preferences.language,
      notifications: preferences.notifications,
      dashboard: preferences.dashboard,
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedPreferences = validateAndMigratePreferences(body)

    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        theme: validatedPreferences.theme,
        timezone: validatedPreferences.timezone,
        language: validatedPreferences.language,
        notifications: validatedPreferences.notifications,
        dashboard: validatedPreferences.dashboard,
      },
      create: {
        userId: session.user.id,
        theme: validatedPreferences.theme,
        timezone: validatedPreferences.timezone,
        language: validatedPreferences.language,
        notifications: validatedPreferences.notifications,
        dashboard: validatedPreferences.dashboard,
      }
    })

    return NextResponse.json({
      theme: updatedPreferences.theme,
      timezone: updatedPreferences.timezone,
      language: updatedPreferences.language,
      notifications: updatedPreferences.notifications,
      dashboard: updatedPreferences.dashboard,
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}