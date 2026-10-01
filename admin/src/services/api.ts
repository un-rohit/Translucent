import { AdminStats, AdminUser, AppConfig } from '@/types/admin';

const TOKEN_KEY = 'translucent_admin_token';
const API_URL_KEY = 'translucent_api_url';

export function getBaseApiUrl(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const customUrl = localStorage.getItem(API_URL_KEY);
  if (customUrl) return customUrl.replace(/\/+$/, '');
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // If running in browser and on port 3000 or same host
  if (window.location.port === '3000') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

export function setBaseApiUrl(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeAdminToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const token = getAdminToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeAdminToken();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  async login(password: string): Promise<{ token: string; message: string }> {
    const res = await request<{ token: string; message: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.token) {
      setAdminToken(res.token);
    }
    return res;
  },

  async getStats(): Promise<AdminStats> {
    return request<AdminStats>('/api/admin/stats');
  },

  async getUsers(): Promise<AdminUser[]> {
    const res = await request<{ users: AdminUser[] }>('/api/admin/users');
    return res.users || [];
  },

  async approveUser(
    userId: number,
    data: { durationDays: number; plan: string; notes?: string }
  ): Promise<{ message: string; user: AdminUser }> {
    return request<{ message: string; user: AdminUser }>(`/api/admin/users/${userId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revokeUser(userId: number, reason: string = 'Revoked by admin'): Promise<{ message: string; user: AdminUser }> {
    return request<{ message: string; user: AdminUser }>(`/api/admin/users/${userId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async deleteUser(userId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getPublicConfig(): Promise<AppConfig> {
    return request<AppConfig>('/api/public/config');
  },

  async updateSettings(settings: Partial<AppConfig> & { newPassword?: string }): Promise<{ message: string }> {
    return request<{ message: string }>('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },
};
