// Permission helpers for client-side checks
import { getAuthFromStorage } from './auth/storage';

export function getPermissionsFromStorage(): string[] | null {
  try {
    const data = getAuthFromStorage();
    if (!data || !data.user) return null;
    const perms = (data.user.permissions as any) || null;
    if (Array.isArray(perms)) return perms;
    return null;
  } catch {
    return null;
  }
}

export function hasPermission(permission: string): boolean {
  const perms = getPermissionsFromStorage();
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function isPermissionDataAvailable(): boolean {
  return getPermissionsFromStorage() !== null;
}
