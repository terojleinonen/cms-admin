/**
 * ResourcePermissionRows component
 * Renders expandable permission rows for each resource in the permission matrix
 */

'use client'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@prisma/client'
import { ResourceConfig } from '@/lib/permission-config'

interface CustomRole {
  id: string
  role: UserRole
  name: string
  description: string
  permissions: Array<{
    resource: string
    action: string
    scope?: string
  }>
  hierarchy: number
  isBuiltIn: boolean
  isCustom?: boolean
}

interface PermissionMatrixCell {
  resource: string
  action: string
  scope?: string
  enabled: boolean
}

interface ResourcePermissionRowsProps {
  resource: ResourceConfig
  roles: CustomRole[]
  permissionMatrix: Record<string, PermissionMatrixCell[]>
  isExpanded: boolean
  onToggleExpansion: () => void
  onPermissionToggle: (role: UserRole, resource: string, action: string, scope?: string) => void
}

export default function ResourcePermissionRows({
  resource,
  roles,
  permissionMatrix,
  isExpanded,
  onToggleExpansion,
  onPermissionToggle,
}: ResourcePermissionRowsProps) {
  return (
    <>
      {/* Resource Header Row */}
      <tr className="bg-gray-50">
        <td className="px-6 py-4">
          <button
            onClick={onToggleExpansion}
            className="flex items-center space-x-2 text-sm font-medium text-gray-900 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <span className="capitalize">{resource.displayName}</span>
            <span className="text-xs text-gray-500">({resource.actions.length} actions)</span>
          </button>
        </td>
        {roles.map((role) => (
          <td key={role.id} className="px-6 py-4 text-center">
            <span className="text-xs text-gray-400">
              {permissionMatrix[role.role]?.filter(cell => 
                cell.resource === resource.name && cell.enabled
              ).length || 0} / {resource.actions.length * resource.scopes.length}
            </span>
          </td>
        ))}
      </tr>

      {/* Action Rows (when expanded) */}
      {isExpanded && resource.actions.map((action) => (
        resource.scopes.map((scope) => (
          <tr key={`${action.name}-${scope.name}`} className="hover:bg-gray-50">
            <td className="px-6 py-3 pl-12">
              <div className="text-sm text-gray-900">
                {action.displayName}
                <span className="ml-2 text-xs text-gray-500">({scope.displayName})</span>
              </div>
              <div className="text-xs text-gray-500">{action.description}</div>
            </td>
            {roles.map((role) => {
              const cell = permissionMatrix[role.role]?.find(c => 
                c.resource === resource.name && 
                c.action === action.name && 
                c.scope === scope.name
              )
              
              return (
                <td key={role.id} className="px-6 py-3 text-center">
                  <button
                    onClick={() => onPermissionToggle(role.role, resource.name, action.name, scope.name)}
                    className="p-1 rounded hover:bg-gray-100"
                    disabled={role.isBuiltIn && role.role === UserRole.ADMIN} // Admin always has all permissions
                  >
                    {cell?.enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                </td>
              )
            })}
          </tr>
        ))
      ))}
    </>
  )
}