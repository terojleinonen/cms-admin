import { Session } from 'next-auth';
import { UserRole } from '@prisma/client';

type Permission = 'create' | 'read' | 'update' | 'delete' | 'preview';

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: ['create', 'read', 'update', 'delete', 'preview'],
  EDITOR: ['create', 'read', 'update', 'preview'],
  VIEWER: ['read'],
};

export function hasPermission(session: Session | null, permission: Permission): boolean {
  if (!session?.user) {
    return false;
  }

  const userRole = (session.user as any).role as UserRole;
  if (!userRole) {
    return false;
  }

  const permissions = rolePermissions[userRole];
  if (!permissions) {
    return false;
  }

  return permissions.includes(permission);
}
