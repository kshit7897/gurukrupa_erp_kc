// Auth storage helpers for login persistence
// Only new code, does not touch existing logic

const AUTH_STORAGE_KEY = 'gurukrupa_auth';

type AuthData = { token: string | null; user: any | null; loginTime: number };

export function saveAuthToStorage(token: string | null, user: any | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const data: AuthData = {
    token,
    user,
    loginTime: Date.now(),
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function getAuthFromStorage(): AuthData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function isAuthExpired(loginTime: number): boolean {
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  return Date.now() - loginTime > SESSION_DURATION;
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('gurukrupa_user'); // also remove legacy user/token
}
