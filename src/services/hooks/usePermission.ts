'use client';

import { useCallback, useMemo } from 'react';
import useUser from './useUser';

const EMPTY_PERMISSIONS: string[] = [];

export type ResourcePermissionAction = 'index' | 'add' | 'edit' | 'delete';

export default function usePermission() {
  const { user } = useUser();
  const permissions = user?.permissionNames ?? EMPTY_PERMISSIONS;
  const isSuperAdmin = Boolean(user?.hasSuperAccess);

  const can = useCallback(
    (perm: string): boolean => {
      if (isSuperAdmin) return true;
      const perms = permissions ?? [];
      if (perms.includes(perm)) return true;
      const [resource] = perm.split(':');
      if (perms.includes('*') || perms.includes(`${resource}:*`)) return true;
      return false;
    },
    [isSuperAdmin, permissions]
  );

  const resourceCan = useCallback(
    (config: { permissions?: Partial<Record<ResourcePermissionAction, string>> } | null | undefined, action: ResourcePermissionAction): boolean => {
      if (!config?.permissions) return true;
      const perm = config.permissions[action];
      if (!perm) return true;
      return can(perm);
    },
    [can]
  );

  return useMemo(
    () => ({ can, resourceCan, isSuperAdmin }),
    [can, resourceCan, isSuperAdmin]
  );
}
