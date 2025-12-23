"use client";
import React from 'react';
import { useAuth } from './AuthProvider';

interface Props {
  perm: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// UI guard: hides children if permission missing. Shows nothing while auth loading.
export const HasPermission: React.FC<Props> = ({ perm, children, fallback = null }) => {
  const { user, isLoading } = useAuth();

  // While auth is being validated, do not render feature (loader handled by AuthProvider)
  if (isLoading) return null;

  // If user or permissions missing, hide (fail-safe)
  const perms: any[] = (user && (user as any).permissions) || [];
  if (!Array.isArray(perms)) return null;
  if (perms.includes('*')) return <>{children}</>;
  if (perms.includes(perm)) return <>{children}</>;
  return <>{fallback}</>;
};

export default HasPermission;
