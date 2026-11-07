/**
 * CodeMate AI — Phase 6 Authentication, Device & Subscription Types
 */

export const PLAN_FREE = 'FREE';
export const PLAN_CORE_PASS = 'PLAN_CORE_PASS';
export const PLAN_AUTOPILOT_PASS = 'PLAN_AUTOPILOT_PASS';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role?: string;
  email_verified: boolean;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'active' | 'suspended' | 'disabled' | string;
  created_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserDevice {
  id: string;
  device_id: string;
  device_name: string;
  browser_name: string;
  browser_version?: string;
  extension_version?: string;
  device_status: 'ACTIVE' | 'REVOKED' | 'active' | 'revoked' | string;
  created_at: string;
  last_seen_at: string;
}

export interface UserSession {
  id: string;
  device_id: string;
  session_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'active' | 'expired' | 'revoked' | string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  is_current?: boolean;
  device_name?: string;
  browser_name?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in paise (e.g. 49900 = ₹499)
  currency: string;
  billing_interval: string;
  device_limit: number;
  concurrent_session_limit: number;
  ai_usage_limit: number;
  feature_entitlements: string[];
  active: boolean;
}

export interface SubscriptionSummary {
  id?: string;
  plan_id: string;
  plan_name: string;
  billing_provider: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  device_limit: number;
  concurrent_session_limit: number;
  ai_usage_limit: number;
  usage_today: number;
  remaining_quota_today: number;
  entitlements: string[];
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_id: string;
  plan_name: string;
}

export interface PaymentRecord {
  id: string;
  provider: string;
  provider_order_id: string;
  provider_payment_id?: string;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
  verified_at?: string;
}

