/**
 * API endpoints for role configuration management
 * Supports CRUD operations for roles and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { permissionConfigManager } from '@/lib/permission-config'
import { UserRole } from '@prisma/client'

// GET /api/admin/roles - Get all roles and their configurations
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const config = permissionConfigManager.getConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        roles: config.roles,
        resources: config.resources,
        routes: config.routes,
      }
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

// POST /api/admin/roles - Create a new custom role
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, hierarchy, permissions } = body

    // Validate required fields
    if (!name || !description || hierarchy === undefined || !permissions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, hierarchy, permissions' },
        { status: 400 }
      )
    }

    // Generate a unique role enum value for custom roles
    const roleValue = `CUSTOM_${name.toUpperCase().replace(/\s+/g, '_')}` as UserRole

    // Check if role name already exists
    const config = permissionConfigManager.getConfig()
    const existingRole = config.roles.find(role => 
      role.name.toLowerCase() === name.toLowerCase() || role.role === roleValue
    )

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      )
    }

    // Create new role
    const newRole = {
      role: roleValue,
      name,
      description,
      hierarchy,
      permissions,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add role to configuration
    permissionConfigManager.addCustomRole(newRole)

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/roles - Update role configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role, name, description, hierarchy, permissions } = body

    if (!role) {
      return NextResponse.json(
        { error: 'Role identifier is required' },
        { status: 400 }
      )
    }

    // Get current configuration
    const config = permissionConfigManager.getConfig()
    const existingRoleIndex = config.roles.findIndex(r => r.role === role)

    if (existingRoleIndex === -1) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const existingRole = config.roles[existingRoleIndex]

    // Prevent modification of built-in roles (except permissions)
    if (!existingRole.isCustom && (name || description || hierarchy !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot modify built-in role properties. Only permissions can be updated.' },
        { status: 400 }
      )
    }

    // Update role
    const updatedRole = {
      ...existingRole,
      ...(name && { name }),
      ...(description && { description }),
      ...(hierarchy !== undefined && { hierarchy }),
      ...(permissions && { permissions }),
      updatedAt: new Date(),
    }

    // Update configuration
    config.roles[existingRoleIndex] = updatedRole
    permissionConfigManager.updateConfig(config)

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/roles - Delete a custom role
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user?.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as UserRole

    if (!role) {
      return NextResponse.json(
        { error: 'Role identifier is required' },
        { status: 400 }
      )
    }

    // Get current configuration
    const config = permissionConfigManager.getConfig()
    const existingRole = config.roles.find(r => r.role === role)

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of built-in roles
    if (!existingRole.isCustom) {
      return NextResponse.json(
        { error: 'Cannot delete built-in roles' },
        { status: 400 }
      )
    }

    // Remove role from configuration
    const success = permissionConfigManager.removeCustomRole(role)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }
}