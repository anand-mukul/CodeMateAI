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

export interface AIProviderInfo {
  id: string;
  name: string;
  models: string[];
  default_model: string;
  configured: boolean;
  status: string;
}

export interface AIProviderStatusResponse {
  active_provider: string;
  active_model: string;
  available_providers: AIProviderInfo[];
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

export interface CustomerPaymentItem {
  id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount: number; // in paise
  currency: string;
  payment_status: string;
  created_at: string;
  verified_at: string | null;
}

export interface CustomerSessionItem {
  id: string;
  device_id: string;
  session_status: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  is_current: boolean;
  device_name?: string;
  browser_name?: string;
}

export interface SupportMessageItem {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  attachment_path?: string | null;
  is_internal_note: boolean;
  created_at: string;
}

export interface SupportTicketDetailItem {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_reply_at: string;
  created_at: string;
  updated_at: string;
  messages: SupportMessageItem[];
}

export interface AdminUserNote {
  id: string;
  admin_id: string;
  note: string;
  created_at: string;
}

export interface AdminUserDetails {
  user: AdminUserItem;
  subscription: SubscriptionSummary | null;
  payments: AdminPaymentItem[];
  devices: DeviceItem[];
  active_sessions: Array<{
    id: string;
    device_id: string;
    device_name: string;
    ip_address?: string;
    created_at: string;
    last_active_at: string;
  }>;
  notes: AdminUserNote[];
}

export interface AdminPaymentItem {
  id: string;
  user_id: string;
  user_email?: string;
  order_id: string;
  payment_id: string | null;
  amount_rupees: number;
  currency: string;
  payment_status: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  coupon_code: string | null;
  discount_amount_paise: number;
  created_at: string;
  verified_at: string | null;
}

export interface AdminSubscriptionItem {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_provider: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface AdminRevenueAnalytics {
  gross_collected_rupees: number;
  total_refunds_rupees: number;
  net_revenue_rupees: number;
  gross_collected_usd: number;
  net_revenue_usd: number;
  total_paying_customers: number;
  active_paid_subscriptions: number;
  payment_success_rate: number;
  estimated_mrr_rupees: number;
  estimated_arr_rupees: number;
  revenue_by_plan: Array<{ plan: string; revenue_rupees: number; count: number }>;
  daily_revenue_timeline: Array<{ date: string; amount_rupees: number; payment_count: number }>;
}

export interface AdminAIDetailedCost {
  total_tokens_consumed: number;
  estimated_total_cost_usd: number;
  estimated_total_cost_inr: number;
  active_primary_provider: string;
  active_primary_model: string;
  cost_by_model: Array<{ model: string; cost_usd: number; cost_inr: number }>;
  cost_by_feature: Array<{ feature: string; cost_usd: number; cost_inr: number }>;
  daily_cost_timeline: Array<{ date: string; cost_usd: number; cost_inr: number }>;
}

export interface AdminBackgroundJob {
  id: string;
  name: string;
  schedule: string;
  status: string;
  last_run_at: string | null;
  next_run_at: string | null;
  duration_ms: number | null;
  details?: Record<string, unknown>;
}

export interface AdminPlatformSettings {
  maintenance_mode: boolean;
  announcement_banner: string | null;
  daily_ai_request_global_cap: number;
  allow_new_registrations: boolean;
  updated_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface FeatureFlagItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  target_audience: string;
  minimum_plan?: string;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
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

  async updateProfile(displayName: string) {
    return fetchWithAuth<UserProfile>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async forgotPassword(email: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  async verifyEmail(token: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async resendVerification(email: string) {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async createHandoffCode() {
    return fetchWithAuth<{ handoff_code: string; expires_in: number }>('/api/auth/handoff/create', {
      method: 'POST',
    });
  },

  async exchangeHandoffCode(handoffCode: string) {
    const data = await fetchWithAuth<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      user: UserProfile;
    }>('/api/auth/handoff/exchange', {
      method: 'POST',
      body: JSON.stringify({ handoff_code: handoffCode }),
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

  async getHistory() {
    return fetchWithAuth<CustomerPaymentItem[]>('/api/payments/history');
  },
};

// ----------------- Sessions API -----------------
export const sessionsApi = {
  async list() {
    return fetchWithAuth<CustomerSessionItem[]>('/api/sessions');
  },

  async revoke(sessionId: string) {
    return fetchWithAuth<{ success: boolean; message: string }>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  async revokeAll() {
    return fetchWithAuth<{ success: boolean; message: string }>('/api/sessions', {
      method: 'DELETE',
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

  async getAIProviderStatus() {
    return fetchWithAuth<AIProviderStatusResponse>('/api/admin/ai-provider');
  },

  async updateAIProvider(provider: string, model?: string) {
    return fetchWithAuth<AIProviderStatusResponse>('/api/admin/ai-provider', {
      method: 'PUT',
      body: JSON.stringify({ provider, model }),
    });
  },

  async testAIProvider(provider: string, model?: string) {
    return fetchWithAuth<{
      provider: string;
      model?: string;
      available: boolean;
      latency_ms?: number;
      sample_response?: string;
      available_models?: string[];
      error?: string;
    }>('/api/admin/ai-provider/test', {
      method: 'POST',
      body: JSON.stringify({ provider, model }),
    });
  },

  async getUserDetails(userId: string) {
    return fetchWithAuth<AdminUserDetails>(`/api/admin/users/${userId}`);
  },

  async banUser(userId: string, reason: string) {
    return fetchWithAuth<{ message: string; user_id: string }>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async unbanUser(userId: string) {
    return fetchWithAuth<{ message: string; user_id: string }>(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  },

  async addUserNote(userId: string, note: string) {
    return fetchWithAuth<AdminUserNote>(`/api/admin/users/${userId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async revokeUserDevice(userId: string, deviceId: string) {
    return fetchWithAuth<{ message: string }>(`/api/admin/users/${userId}/devices/${deviceId}/revoke`, {
      method: 'POST',
    });
  },

  async getSubscriptions() {
    return fetchWithAuth<AdminSubscriptionItem[]>('/api/admin/subscriptions');
  },

  async cancelSubscription(subscriptionId: string, immediately = false) {
    return fetchWithAuth<{ message: string; status: string }>(`/api/admin/subscriptions/${subscriptionId}/cancel?immediately=${immediately}`, {
      method: 'POST',
    });
  },

  async getPayments() {
    return fetchWithAuth<AdminPaymentItem[]>('/api/admin/payments');
  },

  async processRefund(paymentId: string, reason: string, amountPaise?: number) {
    return fetchWithAuth<{ message: string; refund_id: string; amount_refunded_rupees: number }>(`/api/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason, amount_paise: amountPaise }),
    });
  },

  async getRefunds() {
    return fetchWithAuth<AdminPaymentItem[]>('/api/admin/refunds');
  },

  async getRevenueAnalytics(days = 30) {
    return fetchWithAuth<AdminRevenueAnalytics>(`/api/admin/analytics/revenue?days=${days}`);
  },

  async getAIDetailedAnalytics(days = 30) {
    return fetchWithAuth<AdminAIDetailedCost>(`/api/admin/analytics/ai-detailed?days=${days}`);
  },

  async getAuditLogs(limit = 100) {
    return fetchWithAuth<AdminAuditLogItem[]>(`/api/admin/audit-logs?limit=${limit}`);
  },

  async getFeatureFlags() {
    return fetchWithAuth<FeatureFlagItem[]>('/api/admin/features');
  },

  async updateFeatureFlag(flagId: string, payload: Partial<FeatureFlagItem>) {
    return fetchWithAuth<FeatureFlagItem>(`/api/admin/features/${flagId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getJobs() {
    return fetchWithAuth<AdminBackgroundJob[]>('/api/admin/jobs');
  },

  async getSettings() {
    return fetchWithAuth<AdminPlatformSettings>('/api/admin/settings');
  },

  async updateSettings(payload: Partial<AdminPlatformSettings>) {
    return fetchWithAuth<AdminPlatformSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getProductAnalytics() {
    return fetchWithAuth<Record<string, unknown>>('/api/admin/analytics/features');
  },
};

// ----------------- Support API -----------------
export const supportApi = {
  async getTickets() {
    return fetchWithAuth<SupportTicketDetailItem[]>('/api/support/tickets');
  },

  async getTicket(ticketId: string) {
    return fetchWithAuth<SupportTicketDetailItem>(`/api/support/tickets/${ticketId}`);
  },

  async createTicket(payload: {
    subject: string;
    category: string;
    priority?: string;
    initial_message: string;
  }) {
    return fetchWithAuth<SupportTicketDetailItem>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: payload.subject,
        category: payload.category,
        priority: (payload.priority || 'NORMAL').toUpperCase(),
        initial_message: payload.initial_message,
      }),
    });
  },

  async replyTicket(ticketId: string, messageText: string) {
    return fetchWithAuth<SupportMessageItem>(`/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message_text: messageText }),
    });
  },

  async getAdminTickets() {
    return fetchWithAuth<SupportTicketDetailItem[]>('/api/support/admin/tickets');
  },

  async updateTicketStatus(ticketId: string, status: string) {
    return fetchWithAuth<SupportTicketDetailItem>(`/api/support/admin/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: status.toUpperCase() }),
    });
  },
};
