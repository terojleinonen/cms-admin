/**
 * Preferences Migration and Validation Utilities
 * Handles schema changes and data migration for user preferences
 */

import { UserPreferences as PrismaUserPreferences, Theme } from '@prisma/client'
import { prisma } from './db'
import { getDefaultPreferences, UserPreferencesData } from './preferences-middleware'

export interface MigrationResult {
  success: boolean
  migrated: boolean
  errors: string[]
  preferences: UserPreferencesData
}

/**
 * Current schema version for preferences
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Migration functions for each schema version
 */
const migrations: Record<number, (preferences: any) => any> = {
  1: migrateToV1,
}

/**
 * Validate and migrate user preferences to current schema
 */
export async function validateAndMigrateUserPreferences(
  userId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: false,
    errors: [],
    preferences: getDefaultPreferences(),
  }

  try {
    // Get current preferences from database
    const currentPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
    })

    if (!currentPreferences) {
      // No preferences exist, create default ones
      const defaultPrefs = await createDefaultPreferencesForUser(userId)
      result.success = true
      result.preferences = defaultPrefs
      return result
    }

    // Check if migration is needed
    const schemaVersion = getSchemaVersion(currentPreferences)
    
    if (schemaVersion === CURRENT_SCHEMA_VERSION) {
      // No migration needed, just validate
      const validatedPrefs = validatePreferencesStructure(currentPreferences)
      result.success = true
      result.preferences = validatedPrefs
      return result
    }

    // Migration needed
    let migratedPrefs = { ...currentPreferences }
    let migrationApplied = false

    // Apply migrations sequentially
    for (let version = schemaVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
      if (migrations[version]) {
        try {
          migratedPrefs = migrations[version](migratedPrefs)
          migrationApplied = true
        } catch (error) {
          result.errors.push(`Migration to v${version} failed: ${error}`)
        }
      }
    }

    if (migrationApplied) {
      // Save migrated preferences
      const updatedPrefs = await prisma.userPreferences.update({
        where: { userId },
        data: {
          theme: migratedPrefs.theme,
          timezone: migratedPrefs.timezone,
          language: migratedPrefs.language,
          notifications: migratedPrefs.notifications,
          dashboard: migratedPrefs.dashboard,
        },
      })

      result.migrated = true
      result.preferences = validatePreferencesStructure(updatedPrefs)
    } else {
      result.preferences = validatePreferencesStructure(currentPreferences)
    }

    result.success = true
    return result
  } catch (error) {
    result.errors.push(`Migration failed: ${error}`)
    return result
  }
}

/**
 * Get schema version from preferences object
 */
function getSchemaVersion(preferences: any): number {
  // For now, we assume all existing preferences are version 1
  // In future versions, we can add a schemaVersion field
  return preferences.schemaVersion || 1
}

/**
 * Migration to version 1 (current baseline)
 */
function migrateToV1(preferences: any): any {
  const defaultPrefs = getDefaultPreferences()

  return {
    ...preferences,
    theme: validateTheme(preferences.theme) || defaultPrefs.theme,
    timezone: validateTimezone(preferences.timezone) || defaultPrefs.timezone,
    language: validateLanguage(preferences.language) || defaultPrefs.language,
    notifications: validateNotifications(preferences.notifications) || defaultPrefs.notifications,
    dashboard: validateDashboard(preferences.dashboard) || defaultPrefs.dashboard,
    schemaVersion: 1,
  }
}

/**
 * Validate preferences structure and fill in missing fields
 */
function validatePreferencesStructure(
  preferences: PrismaUserPreferences
): UserPreferencesData {
  const defaultPrefs = getDefaultPreferences()

  return {
    theme: validateTheme(preferences.theme) || defaultPrefs.theme,
    timezone: validateTimezone(preferences.timezone) || defaultPrefs.timezone,
    language: validateLanguage(preferences.language) || defaultPrefs.language,
    notifications: validateNotifications(preferences.notifications) || defaultPrefs.notifications,
    dashboard: validateDashboard(preferences.dashboard) || defaultPrefs.dashboard,
  }
}

/**
 * Validate theme value
 */
function validateTheme(theme: any): 'LIGHT' | 'DARK' | 'SYSTEM' | null {
  const validThemes = ['LIGHT', 'DARK', 'SYSTEM']
  return validThemes.includes(theme) ? theme : null
}

/**
 * Validate timezone value
 */
function validateTimezone(timezone: any): string | null {
  if (typeof timezone !== 'string' || timezone.length === 0) {
    return null
  }

  // Basic timezone validation - check if it's a valid IANA timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return timezone
  } catch {
    return null
  }
}

/**
 * Validate language value
 */
function validateLanguage(language: any): string | null {
  if (typeof language !== 'string' || language.length === 0) {
    return null
  }

  // Basic language code validation (ISO 639-1)
  const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/
  return languageRegex.test(language) ? language : null
}

/**
 * Validate notifications object
 */
function validateNotifications(notifications: any): {
  email: boolean
  push: boolean
  security: boolean
  marketing: boolean
} | null {
  if (!notifications || typeof notifications !== 'object') {
    return null
  }

  const defaultNotifications = getDefaultPreferences().notifications

  return {
    email: typeof notifications.email === 'boolean' 
      ? notifications.email 
      : defaultNotifications.email,
    push: typeof notifications.push === 'boolean' 
      ? notifications.push 
      : defaultNotifications.push,
    security: typeof notifications.security === 'boolean' 
      ? notifications.security 
      : defaultNotifications.security,
    marketing: typeof notifications.marketing === 'boolean' 
      ? notifications.marketing 
      : defaultNotifications.marketing,
  }
}

/**
 * Validate dashboard object
 */
function validateDashboard(dashboard: any): {
  layout: string
  widgets: string[]
  defaultView: string
} | null {
  if (!dashboard || typeof dashboard !== 'object') {
    return null
  }

  const defaultDashboard = getDefaultPreferences().dashboard

  return {
    layout: typeof dashboard.layout === 'string' 
      ? dashboard.layout 
      : defaultDashboard.layout,
    widgets: Array.isArray(dashboard.widgets) 
      ? dashboard.widgets.filter(w => typeof w === 'string')
      : defaultDashboard.widgets,
    defaultView: typeof dashboard.defaultView === 'string' 
      ? dashboard.defaultView 
      : defaultDashboard.defaultView,
  }
}

/**
 * Create default preferences for a new user
 */
async function createDefaultPreferencesForUser(userId: string): Promise<UserPreferencesData> {
  const defaultPrefs = getDefaultPreferences()

  try {
    const preferences = await prisma.userPreferences.create({
      data: {
        userId,
        theme: defaultPrefs.theme as Theme,
        timezone: defaultPrefs.timezone,
        language: defaultPrefs.language,
        notifications: defaultPrefs.notifications,
        dashboard: defaultPrefs.dashboard,
      },
    })

    return {
      theme: preferences.theme,
      timezone: preferences.timezone,
      language: preferences.language,
      notifications: preferences.notifications as any,
      dashboard: preferences.dashboard as any,
    }
  } catch (error) {
    console.error('Error creating default preferences:', error)
    return defaultPrefs
  }
}

/**
 * Batch migrate all user preferences
 * Useful for running migrations across all users
 */
export async function batchMigrateAllUserPreferences(): Promise<{
  total: number
  migrated: number
  errors: string[]
}> {
  const result = {
    total: 0,
    migrated: 0,
    errors: [] as string[],
  }

  try {
    // Get all users with preferences
    const users = await prisma.user.findMany({
      select: { id: true },
      where: {
        preferences: {
          isNot: null,
        },
      },
    })

    result.total = users.length

    // Migrate each user's preferences
    for (const user of users) {
      try {
        const migrationResult = await validateAndMigrateUserPreferences(user.id)
        
        if (migrationResult.migrated) {
          result.migrated++
        }
        
        if (migrationResult.errors.length > 0) {
          result.errors.push(...migrationResult.errors.map(
            error => `User ${user.id}: ${error}`
          ))
        }
      } catch (error) {
        result.errors.push(`User ${user.id}: ${error}`)
      }
    }

    return result
  } catch (error) {
    result.errors.push(`Batch migration failed: ${error}`)
    return result
  }
}

/**
 * Ensure user has preferences (create if missing)
 */
export async function ensureUserPreferences(userId: string): Promise<UserPreferencesData> {
  try {
    const migrationResult = await validateAndMigrateUserPreferences(userId)
    return migrationResult.preferences
  } catch (error) {
    console.error('Error ensuring user preferences:', error)
    return getDefaultPreferences()
  }
}