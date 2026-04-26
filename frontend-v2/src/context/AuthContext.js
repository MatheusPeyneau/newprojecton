import { useCallback } from 'react';

export function useAuth() {
  try {
    const raw = localStorage.getItem('fluxscale.user');
    const user = raw ? JSON.parse(raw) : null;
    const token = localStorage.getItem('fluxscale.token');
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

export function getAuthHeader() {
  const token = localStorage.getItem('fluxscale.token');
  return { Authorization: `Bearer ${token}` };
}

export const API = `${import.meta.env.VITE_BACKEND_URL}/api`;
