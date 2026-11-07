/**
 * CodeMate AI — Client Authentication & SaaS Service (auth-service.ts)
 * 
 * Manages client installation identifiers, JWT tokens, automatic refresh cycles,
 * remote session revocation, plan entitlement queries, and Razorpay checkout triggers.
 */

import {
  UserProfile,
  AuthTokens,
  UserDevice,
  UserSession,
  SubscriptionPlan,
  SubscriptionSummary,
  RazorpayOrderResponse,
  PaymentRecord,
} from '../types/auth';

const DEVICE_ID_KEY = 'codemate_device_id_v1';
const AUTH_TOKENS_KEY = 'codemate_auth_tokens_v1';

export class AuthService {
  private static cachedDeviceId: string | null = null;
  private static cachedAccessToken: string | null = null;
  private static cachedRefreshToken: string | null = null;
  private static refreshPromise: Promise<{ access_token: string; refresh_token: string } | null> | null = null;
  private static baseUrl: string = (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    'https://codemate-backend-wsi1.onrender.com'
  ).replace(/\/$/, '');

  private static webPortalUrl: string = (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WEB_PORTAL_URL) ||
    ''
  ).replace(/\/$/, '');

  public static setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  public static setWebPortalUrl(url: string) {
    this.webPortalUrl = url.replace(/\/$/, '');
  }

  public static getWebPortalUrl(): string {
    if (this.webPortalUrl) return this.webPortalUrl;
    if (this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('localhost')) {
      return 'http://localhost:3000';
    }
    return 'https://codemate-frontend.onrender.com';
  }

  public static getCachedAccessToken(): string | null {
    return this.cachedAccessToken;
  }

  /**
   * Retrieves or initializes a cryptographically secure random installation UUID.
   * Zero invasive fingerprinting.
   */
  public static async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([DEVICE_ID_KEY]);
      if (res[DEVICE_ID_KEY]) {
        this.cachedDeviceId = res[DEVICE_ID_KEY];
        return this.cachedDeviceId!;
      }
    }

    // Generate new UUID
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `inst_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    this.cachedDeviceId = newId;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [DEVICE_ID_KEY]: newId });
    }

    return newId;
  }

  /**
   * Retrieves stored access token.
   */
  public static async getAccessToken(): Promise<string | null> {
    if (this.cachedAccessToken) return this.cachedAccessToken;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([AUTH_TOKENS_KEY]);
      if (res[AUTH_TOKENS_KEY]?.access_token) {
        this.cachedAccessToken = res[AUTH_TOKENS_KEY].access_token;
        this.cachedRefreshToken = res[AUTH_TOKENS_KEY].refresh_token;
        return this.cachedAccessToken;
      }
    }

    return null;
  }

  public static async getRefreshToken(): Promise<string | null> {
    if (this.cachedRefreshToken) return this.cachedRefreshToken;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([AUTH_TOKENS_KEY]);
      if (res[AUTH_TOKENS_KEY]?.refresh_token) {
        this.cachedRefreshToken = res[AUTH_TOKENS_KEY].refresh_token;
        return this.cachedRefreshToken;
      }
    }

    return null;
  }

  public static async saveTokens(tokens: { access_token: string; refresh_token: string; user?: any }): Promise<void> {
    this.cachedAccessToken = tokens.access_token;
    this.cachedRefreshToken = tokens.refresh_token;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data: Record<string, any> = {
        [AUTH_TOKENS_KEY]: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          saved_at: Date.now(),
        },
        codemate_auth_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          saved_at: Date.now(),
        },
      };
      if (tokens.user) {
        data['codemate_user_v1'] = tokens.user;
      }
      await chrome.storage.local.set(data);
    }
  }

  public static async clearTokens(): Promise<void> {
    this.cachedAccessToken = null;
    this.cachedRefreshToken = null;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove([AUTH_TOKENS_KEY, 'codemate_auth_tokens', 'codemate_user_v1']);
    }
  }

  /**
   * Core authenticated request wrapper. Automatically attaches Bearer token & Device ID.
   */
  public static async fetchAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const deviceId = await this.getDeviceId();
    const token = await this.getAccessToken();

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Device-ID': deviceId,
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration & automatic rotation (HTTP 401)
    if (response.status === 401 && token) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed.access_token}`;
        response = await fetch(url, { ...options, headers });
      } else {
        await this.clearTokens();
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
      const errorMsg = typeof errorBody.detail === 'string'
        ? errorBody.detail
        : errorBody.detail?.detail || errorBody.detail?.message || 'Authentication error';
      const err = new Error(errorMsg) as Error & { code?: string; status?: number; data?: any };
      err.status = response.status;
      err.code = errorBody.detail?.code || errorBody.error_code;
      err.data = errorBody.detail;
      throw err;
    }

    return response.json();
  }

  /**
   * Refreshes access token using rotating refresh token.
   * Single-flight promise mutex prevents race conditions from concurrent 401s.
   */
  public static async refreshTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) return null;

      const deviceId = await this.getDeviceId();
      try {
        const resp = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Device-ID': deviceId },
          body: JSON.stringify({ refresh_token: refreshToken, device_id: deviceId }),
        });

        if (!resp.ok) {
          await this.clearTokens();
          return null;
        }

        const data: AuthTokens = await resp.json();
        await this.saveTokens(data);
        return data;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth Operations
  public static async register(email: string, password: string, displayName = 'Developer'): Promise<UserProfile> {
    return this.fetchAuth<UserProfile>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  }

  public static async login(email: string, password: string): Promise<AuthTokens> {
    const deviceId = await this.getDeviceId();
    const data = await this.fetchAuth<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        device_id: deviceId,
        device_name: 'Chrome Extension',
        browser_name: 'Chrome',
        extension_version: '1.0.0',
      }),
    });
    await this.saveTokens(data);
    return data;
  }

  public static async loginWithToken(token: string): Promise<UserProfile> {
    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('Session token cannot be empty.');

    this.cachedAccessToken = cleanToken;
    this.cachedRefreshToken = cleanToken;

    await this.saveTokens({
      access_token: cleanToken,
      refresh_token: cleanToken,
    });

    try {
      const profile = await this.getProfile();
      await this.saveTokens({
        access_token: cleanToken,
        refresh_token: cleanToken,
        user: profile,
      });
      return profile;
    } catch (err: any) {
      await this.clearTokens();
      throw new Error(err.message || 'Invalid session token. Please copy a fresh token from the web dashboard.');
    }
  }

  public static async logout(): Promise<void> {
    try {
      await this.fetchAuth('/api/auth/logout', { method: 'POST' });
    } finally {
      await this.clearTokens();
    }
  }

  public static async logoutAll(): Promise<void> {
    try {
      await this.fetchAuth('/api/auth/logout-all', { method: 'POST' });
    } finally {
      await this.clearTokens();
    }
  }

  public static async getProfile(): Promise<UserProfile> {
    return this.fetchAuth<UserProfile>('/api/auth/me');
  }

  public static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public static async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  // Device Management (Layer 1)
  public static async getDevices(): Promise<UserDevice[]> {
    return this.fetchAuth<UserDevice[]>('/api/devices');
  }

  public static async updateDevice(deviceId: string, deviceName: string): Promise<UserDevice> {
    return this.fetchAuth<UserDevice>(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ device_name: deviceName }),
    });
  }

  public static async revokeDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth(`/api/devices/${deviceId}`, { method: 'DELETE' });
  }

  // Session Management (Layer 2)
  public static async getSessions(): Promise<UserSession[]> {
    return this.fetchAuth<UserSession[]>('/api/sessions');
  }

  public static async terminateSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  }

  public static async terminateOtherSessions(): Promise<{ success: boolean; message: string }> {
    return this.fetchAuth('/api/sessions', { method: 'DELETE' });
  }

  // Subscription & Entitlements (Layer 4)
  public static async getSubscription(): Promise<SubscriptionSummary> {
    return this.fetchAuth<SubscriptionSummary>('/api/subscription/me');
  }

  public static async getPlans(): Promise<SubscriptionPlan[]> {
    return this.fetchAuth<SubscriptionPlan[]>('/api/subscription/plans');
  }

  public static async cancelSubscription(): Promise<SubscriptionSummary> {
    return this.fetchAuth<SubscriptionSummary>('/api/subscription/cancel', { method: 'POST' });
  }

  // Razorpay Integration
  public static async createOrder(planId: string, couponCode?: string): Promise<RazorpayOrderResponse> {
    return this.fetchAuth<RazorpayOrderResponse>('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, coupon_code: couponCode }),
    });
  }

  public static async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    planId: string
  ): Promise<{ success: boolean; subscription: SubscriptionSummary }> {
    return this.fetchAuth('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        plan_id: planId,
      }),
    });
  }

  public static async getPaymentHistory(): Promise<PaymentRecord[]> {
    return this.fetchAuth<PaymentRecord[]>('/api/payments/history');
  }
}

