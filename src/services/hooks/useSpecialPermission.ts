'use client';

import { useCallback, useMemo } from 'react';
import useUser from './useUser';

export type SpecialPermissionAware = {
  permission?: string;
};

export function getSpecialPermissionNames(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];

  const names = (user as { specialPermissionNames?: unknown }).specialPermissionNames;
  if (!Array.isArray(names)) return [];

  return names.filter((name): name is string => typeof name === 'string');
}

export function canAccessSpecialPermission(
  permission: string | undefined,
  specialPermissionNames: readonly string[]
): boolean {
  if (!permission) return true;
  return specialPermissionNames.includes(permission);
}

export function filterBySpecialPermission<T extends SpecialPermissionAware>(
  items: readonly T[] | undefined,
  specialPermissionNames: readonly string[]
): T[] {
  if (!items?.length) return [];
  return items.filter((item) =>
    canAccessSpecialPermission(item.permission, specialPermissionNames)
  );
}

export default function useSpecialPermission() {
  const { user } = useUser();

  const specialPermissionNames = useMemo(
    () => getSpecialPermissionNames(user),
    [user]
  );

  const canAccess = useCallback(
    (permission?: string) =>
      canAccessSpecialPermission(permission, specialPermissionNames),
    [specialPermissionNames]
  );

  const filterByPermission = useCallback(
    <T extends SpecialPermissionAware>(items: readonly T[] | undefined): T[] =>
      filterBySpecialPermission(items, specialPermissionNames),
    [specialPermissionNames]
  );

  return useMemo(
    () => ({ canAccess, filterByPermission, specialPermissionNames }),
    [canAccess, filterByPermission, specialPermissionNames]
  );
}
