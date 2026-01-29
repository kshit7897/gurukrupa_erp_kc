import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

/**
 * Company context utilities for multi-company support
 * 
 * The activeCompanyId is stored in the JWT token and also as a separate cookie
 * for easy access in middleware.
 */

export interface CompanyContext {
  companyId: string | null;
  userId: string | null;
  role: string | null;
  permissions: string[];
}

/**
 * Decode JWT payload without verification (for quick reads)
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Get company context from request headers/cookies
 * Use this in API routes to get the active company
 */
export async function getCompanyContext(): Promise<CompanyContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value;
  
  const defaultContext: CompanyContext = {
    companyId: activeCompanyId || null,
    userId: null,
    role: null,
    permissions: []
  };
  
  if (!token) return defaultContext;
  
  const payload = decodeJwtPayload(token);
  if (!payload) return defaultContext;
  
  return {
    companyId: activeCompanyId || payload.activeCompanyId || null,
    userId: payload.id || null,
    role: payload.role || null,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : []
  };
}

/**
 * Get company context from request object (for API routes)
 * Extracts from Authorization header or cookies
 */
export function getCompanyContextFromRequest(request: Request): CompanyContext {
  const defaultContext: CompanyContext = {
    companyId: null,
    userId: null,
    role: null,
    permissions: []
  };
  
  // Try to get from cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  
  const token = cookies['token'];
  const activeCompanyId = cookies['activeCompanyId'];
  
  if (!token) return { ...defaultContext, companyId: activeCompanyId || null };
  
  const payload = decodeJwtPayload(token);
  if (!payload) return { ...defaultContext, companyId: activeCompanyId || null };
  
  return {
    companyId: activeCompanyId || payload.activeCompanyId || null,
    userId: payload.id || null,
    role: payload.role || null,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : []
  };
}

/**
 * Require company context - throws error if no company is selected
 */
export async function requireCompanyContext(): Promise<CompanyContext & { companyId: string }> {
  const ctx = await getCompanyContext();
  if (!ctx.companyId) {
    throw new Error('NO_COMPANY_SELECTED');
  }
  return ctx as CompanyContext & { companyId: string };
}

/**
 * Build a MongoDB filter with company scoping
 */
export function withCompanyScope(filter: Record<string, any>, companyId: string | null): Record<string, any> {
  if (!companyId) return filter;
  return { ...filter, companyId };
}
