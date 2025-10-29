import { Session } from 'next-auth';
import { simplePermissionService } from './simple-permissions';

type Permission = 'create' | 'read' | 'update' | 'delete' | 'preview';

export function hasPermission(session: Session | null, permission: Permission): boolean {
  if (!session?.user) {
    return false;
  }

  const user = session.user as any;
  
  // Map legacy permissions to resource:action format
  const resourceActionMap: Record<Permission, { resource: string; action: string }> = {
    'create': { resource: 'products', action: 'create' },
    'read': { resource: 'products', action: 'read' },
    'update': { resource: 'products', action: 'update' },
    'delete': { resource: 'products', action: 'delete' },
    'preview': { resource: 'pages', action: 'read' },
  };

  const mapped = resourceActionMap[permission];
  return simplePermissionService.hasPermission(user, mapped.resource, mapped.action);
}
