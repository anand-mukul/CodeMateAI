/**
 * CodeMate Web Client — API Service Layer
 * Clean, robust communication with the FastAPI backend.
 * Zero raw template reliance; strict JSON-only contracts.
 */

export const PLAN_FREE = "FREE";
export const PLAN_CORE_PASS = "PLAN_CORE_PASS";
export const PLAN_AUTOPILOT_PASS = "PLAN_AUTOPILOT_PASS";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN" | "SUPPORT_AGENT" | "ANALYST" | string;
  auth_provider: string;
  email_verified: boolean;
  account_status: string;
  created_at: string;
  last_login_at?: string;
}

export interface PlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_interval: string;
  device_limit: number;
  concurrent_session_limit: number;
  ai_usage_limit: number;
  feature_entitlements: string[];
  active: boolean;
}

export interface SubscriptionSummary {
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  daily_ai_solves_used: number;
  ai_usage_limit: number;
  device_limit: number;
  concurrent_session_limit: number;
  feature_entitlements: string[];
}

export interface DeviceItem {
  id: string;
  device_id: string;
  device_name?: string;
  browser_name?: string;
  browser_version?: string;
  extension_version?: string;
  device_status: "active" | "revoked";
  created_at: string;
  last_seen_at?: string;
  revoked_at?: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  display_name: string;
  role: string;
  account_status: string;
  email_verified: boolean;
  plan_name?: string;
  created_at: string;
  last_login_at?: string;
  active_sessions_count: number;
}

export interface CouponItem {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  current_uses: number;
  active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface SupportTicketItem {
  id: string;
  user_id: string;
  user_email?: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at?: string;
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // In the browser, use empty string so all requests hit the Next.js domain and are routed via proxy.ts
  if (typeof window !== 'undefined') {
    return '';
  }
  return (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function parseErrorMessage(data: unknown, fallback = 'Request failed. Please check credentials.'): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const err = data as Record<string, unknown>;
    if (typeof err.detail === 'string') return err.detail;
    if (err.detail && typeof err.detail === 'object') {
      const d = err.detail as Record<string, unknown>;
      return (d.detail || d.message || d.code || JSON.stringify(d)) as string;
    }
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (err.msg && typeof err.msg === 'string') return err.msg;
  }
  return fallback;
}

export async function fetchWithAuth<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('codemate_web_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const base = getApiBaseUrl();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, attempt token refresh using refresh token
  if (response.status === 401 && token && typeof window !== 'undefined') {
    const refreshedToken = await authApi.refreshToken();
    if (refreshedToken) {
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(data));
  }

  return data as T;
}

// ----------------- Auth API -----------------
export const authApi = {
  async register(email: string, password: string, displayName: string) {
    return fetchWithAuth<UserProfile>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  },

  async login(email: string, password: string) {
    const data = await fetchWithAuth<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      user: UserProfile;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        device_id: 'web_portal',
        device_name: 'CodeMate Web Workspace',
      }),
    });
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('codemate_web_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('codemate_refresh_token', data.refresh_token);
      }
      localStorage.setItem('codemate_user_role', data.user.role);
    }
    return data;
  },

  async refreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem('codemate_refresh_token');
    if (!refreshToken) return null;

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'web_portal' },
        body: JSON.stringify({ refresh_token: refreshToken, device_id: 'web_portal' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('codemate_web_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('codemate_refresh_token', data.refresh_token);
        }
        return data.access_token;
      }
    } catch {
      return null;
    }
    return null;
  },

  async getMe() {
    return fetchWithAuth<UserProfile>('/api/auth/me');
  },

  async resendVerification(email: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async logout() {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('codemate_web_token');
        localStorage.removeItem('codemate_refresh_token');
        localStorage.removeItem('codemate_user_role');
      }
    }
  },
};

// ----------------- Subscription API -----------------
export const subscriptionApi = {
  async getPlans() {
    return fetchWithAuth<PlanItem[]>('/api/subscription/plans');
  },

  async getMySubscription() {
    return fetchWithAuth<SubscriptionSummary>('/api/subscription/me');
  },

  async cancel() {
    return fetchWithAuth<SubscriptionSummary>('/api/subscription/cancel', {
      method: 'POST',
    });
  },
};

// ----------------- Devices API -----------------
export const devicesApi = {
  async list() {
    return fetchWithAuth<DeviceItem[]>('/api/devices');
  },

  async revoke(deviceId: string) {
    return fetchWithAuth<{ success: boolean; message: string }>(`/api/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },

  async updateName(deviceId: string, deviceName: string) {
    return fetchWithAuth<DeviceItem>(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ device_name: deviceName }),
    });
  },
};

// ----------------- Payments API -----------------
export const paymentsApi = {
  async createOrder(planId: string, couponCode?: string) {
    return fetchWithAuth<{
      order_id: string;
      amount: number;
      currency: string;
      key_id: string;
      plan_id: string;
      discount_applied?: number;
    }>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, coupon_code: couponCode || null }),
    });
  },

  async verify(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan_id: string;
  }) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ----------------- Admin API -----------------
export const adminApi = {
  async getOverview() {
    return fetchWithAuth<Record<string, unknown>>('/api/admin/analytics/overview');
  },

  async getUsers() {
    return fetchWithAuth<AdminUserItem[]>('/api/admin/users');
  },

  async suspendUser(userId: string, reason = 'Administrative suspension') {
    return fetchWithAuth(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reactivateUser(userId: string) {
    return fetchWithAuth(`/api/admin/users/${userId}/reactivate`, {
      method: 'POST',
    });
  },

  async updateUserRole(userId: string, role: string) {
    return fetchWithAuth(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async revokeUserSessions(userId: string) {
    return fetchWithAuth(`/api/admin/users/${userId}/revoke-sessions`, {
      method: 'POST',
    });
  },

  async getCoupons() {
    return fetchWithAuth<CouponItem[]>('/api/admin/coupons');
  },

  async createCoupon(data: {
    code: string;
    discount_percent: number;
    max_uses: number;
    expires_at?: string;
  }) {
    return fetchWithAuth<CouponItem>('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleCoupon(couponId: string) {
    return fetchWithAuth<CouponItem>(`/api/admin/coupons/${couponId}/toggle`, {
      method: 'POST',
    });
  },

  async deleteCoupon(couponId: string) {
    return fetchWithAuth(`/api/admin/coupons/${couponId}`, {
      method: 'DELETE',
    });
  },

  async getSystemHealth() {
    return fetchWithAuth<Record<string, unknown>>('/api/admin/system/health');
  },
};

// ----------------- Support API -----------------
export const supportApi = {
  async getTickets() {
    return fetchWithAuth<SupportTicketItem[]>('/api/support/tickets');
  },

  async createTicket(payload: {
    title: string;
    description: string;
    category: string;
    priority: string;
  }) {
    return fetchWithAuth<SupportTicketItem>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminTickets() {
    return fetchWithAuth<SupportTicketItem[]>('/api/support/admin/tickets');
  },

  async updateTicketStatus(ticketId: string, status: string) {
    return fetchWithAuth<SupportTicketItem>(`/api/support/admin/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
