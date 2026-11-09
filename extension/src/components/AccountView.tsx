/**
 * CodeMate AI — Account, Devices, Sessions, Subscriptions, Feedback & Support (AccountView.tsx)
 * Streamlined SaaS management view with elevated modern UI, responsive tabs, and live quota tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Smartphone,
  Layers,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Trash2,
  Edit2,
  Zap,
  ThumbsUp,
  Send,
  ShieldCheck,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  ChevronRight,
  Clock,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth-service';
import { AnalyticsService } from '../services/analytics-service';
import { CodeMateApiClient } from '../services/api';
import {
  FeedbackSupportService,
  FeatureRequestDTO,
  SupportTicketDTO,
} from '../services/feedback-support-service';
import { PaymentRecord, SubscriptionPlan } from '../types/auth';

interface AccountViewProps {
  onNotify?: (message: string, isError?: boolean) => void;
  onOpenAuthModal?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNotify, onOpenAuthModal }) => {
  const {
    user,
    subscription,
    devices,
    sessions,
    plans,
    isLoading,
    logout,
    logoutAll,
    refreshAuth,
    refreshSubscription,
    refreshDevices,
    refreshSessions,
  } = useAuth();

  // 4 Streamlined primary tabs: overview, plans, security, support
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'security' | 'support'>('overview');
  
  // Sub-views for Support & Feedback
  const [supportSubTab, setSupportSubTab] = useState<'feedback' | 'tickets'>('feedback');

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  // Promo Code & Discount Engine State
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(0);
  const [isRedeemingPromo, setIsRedeemingPromo] = useState<boolean>(false);

  // Analytics Opt-Out State
  const [optOutAnalytics, setOptOutAnalytics] = useState<boolean>(AnalyticsService.isUserOptedOut());

  // Feedback & Feature Requests State
  const [feedbackCategory, setFeedbackCategory] = useState<'general' | 'bug_report' | 'usability' | 'ai_quality' | 'suggestion'>('suggestion');
  const [feedbackTitle, setFeedbackTitle] = useState<string>('');
  const [feedbackDesc, setFeedbackDesc] = useState<string>('');
  const [feedbackScore, setFeedbackScore] = useState<number>(5);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestDTO[]>([]);
  const [newFrTitle, setNewFrTitle] = useState<string>('');
  const [newFrDesc, setNewFrDesc] = useState<string>('');
  const [newFrCategory, setNewFrCategory] = useState<string>('ai_features');
  const [showNewFrForm, setShowNewFrForm] = useState<boolean>(false);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [selectedUserTicket, setSelectedUserTicket] = useState<SupportTicketDTO | null>(null);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketCategory, setTicketCategory] = useState<string>('ai_functionality');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [userReplyText, setUserReplyText] = useState<string>('');
  const [showNewTicketForm, setShowNewTicketForm] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'plans' && user) {
      AuthService.getPaymentHistory().then(setPayments).catch(() => {});
    } else if (activeTab === 'support' && user) {
      if (supportSubTab === 'feedback') {
        FeedbackSupportService.listFeatureRequests().then(setFeatureRequests).catch(() => {});
      } else {
        FeedbackSupportService.listMyTickets().then(setTickets).catch(() => {});
      }
    }
  }, [activeTab, supportSubTab, user]);

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center gap-3 animate-fade-in font-sans">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Sign in to CodeMate AI</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Authenticate to sync devices, track concurrent sessions, access daily quotas, and upgrade to Pro.
          </p>
        </div>
        <button
          onClick={onOpenAuthModal}
          className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <User className="w-3.5 h-3.5" />
          <span>Sign In / Create Account</span>
        </button>
      </div>
    );
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? It will require re-registration.')) return;
    setActionLoading(true);
    try {
      await AuthService.revokeDevice(deviceId);
      await refreshDevices();
      onNotify?.('Device revoked successfully.', false);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to revoke device', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDeviceName = async () => {
    if (!editingDevice) return;
    setActionLoading(true);
    try {
      await AuthService.updateDevice(editingDevice.id, editingDevice.name);
      await refreshDevices();
      setEditingDevice(null);
      onNotify?.('Device renamed.', false);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to rename device', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setActionLoading(true);
    try {
      await AuthService.terminateSession(sessionId);
      await refreshSessions();
      onNotify?.('Session terminated.', false);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to terminate session', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateOtherSessions = async () => {
    if (!confirm('Terminate all sessions on other devices?')) return;
    setActionLoading(true);
    try {
      await AuthService.terminateOtherSessions();
      await refreshSessions();
      onNotify?.('All other active sessions revoked.', false);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to terminate other sessions', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeemPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setIsRedeemingPromo(true);
    try {
      if (code === 'CAMPUS100' || code === 'FREEPASS' || code === 'AMBASSADOR' || code === 'HACKATHON') {
        const res = await CodeMateApiClient.request<{ success: boolean; message: string; duration_days: number }>('/api/subscription/redeem-promo', {
          method: 'POST',
          body: JSON.stringify({ code: code, plan_id: 'PLAN_AUTOPILOT_PASS' }),
        });
        await refreshSubscription();
        onNotify?.(res.message || 'Free promotional pass redeemed!', false);
        setPromoInput('');
        setAppliedCoupon(null);
        setCouponDiscountPercent(0);
      } else {
        const res = await CodeMateApiClient.request<{ valid: boolean; discount_percent: number; message: string }>('/api/subscription/validate-promo', {
          method: 'POST',
          body: JSON.stringify({ code: code, plan_id: 'PLAN_CORE_PASS' }),
        });
        setAppliedCoupon(code);
        setCouponDiscountPercent(res.discount_percent);
        onNotify?.(`✓ Promo code ${code} applied (${res.discount_percent}% OFF). Discount will be applied at Razorpay checkout!`, false);
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Invalid or expired promo code', true);
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  const handleUpgradePlan = async (plan: SubscriptionPlan) => {
    setCheckoutLoading(plan.id);
    try {
      const order = await AuthService.createOrder(plan.id, appliedCoupon || undefined);
      const token = await AuthService.getAccessToken();
      const webUrl = AuthService.getWebPortalUrl();
      let checkoutUrl = `${webUrl}/pricing?order_id=${encodeURIComponent(order.order_id)}&plan_id=${encodeURIComponent(plan.id)}`;
      if (token) {
        checkoutUrl += `&token=${encodeURIComponent(token)}`;
      }
      if (appliedCoupon) {
        checkoutUrl += `&coupon=${encodeURIComponent(appliedCoupon)}`;
      }

      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: checkoutUrl });
      } else {
        window.open(checkoutUrl, '_blank');
      }

      onNotify?.(`Launched secure Razorpay checkout for ${plan.name} in a new tab. Complete payment to activate.`, false);
    } catch (err: any) {
      onNotify?.(err.message || 'Checkout failed', true);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const userRole = (user.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const quotaUsed = subscription?.usage_today ?? 0;
  const quotaLimit = isAdmin ? 999999 : (subscription?.ai_usage_limit ?? 10);
  const quotaPercent = isAdmin ? 0 : Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
  const quotaRemaining = isAdmin ? 999999 : (subscription?.remaining_quota_today ?? Math.max(0, quotaLimit - quotaUsed));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col font-sans animate-fade-in text-xs">
      {/* Top Profile Card */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Avatar with clean surface */}
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center justify-center text-xs shrink-0 shadow-xs">
            {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-100 text-xs tracking-tight">{user.display_name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {isAdmin ? 'Admin' : (subscription?.plan_name || 'Free tier')}
              </span>
              {user.email_verified ? (
                <span className="text-emerald-400 text-[10px] flex items-center" title="Email Verified">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Unverified
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
              <span className="truncate max-w-[180px]">{user.email}</span>
              <button
                onClick={handleCopyEmail}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 cursor-pointer"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions: Refresh & Sign Out */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => refreshAuth()}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Streamlined Primary Sub-Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950 p-1 gap-1 text-[11px]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-1.5 px-2 rounded-md font-medium text-center transition-colors cursor-pointer truncate ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`py-1.5 px-2 rounded-md font-medium text-center transition-colors cursor-pointer truncate ${
            activeTab === 'plans'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Plans
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-1.5 px-2 rounded-md font-medium text-center transition-colors cursor-pointer truncate ${
            activeTab === 'security'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Devices ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`py-1.5 px-2 rounded-md font-medium text-center transition-colors cursor-pointer truncate ${
            activeTab === 'support'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Support
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="p-3 flex flex-col gap-2.5">
          {/* Email Verification Alert Banner */}
          {!user.email_verified && (
            <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg flex items-center justify-between text-amber-200 text-xs">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">Email unverified. Check your inbox.</span>
              </div>
              <button
                onClick={async () => {
                  await AuthService.resendVerification(user.email);
                  onNotify?.('Verification email sent to ' + user.email, false);
                }}
                className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
              >
                Resend Link
              </button>
            </div>
          )}

          {/* Daily AI Quota Meter Card */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isAdmin ? 'Platform Access' : 'Daily AI Quota'}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {isAdmin ? (
                  <span className="text-emerald-400 font-medium">Unlimited</span>
                ) : (
                  <>
                    <strong className="text-slate-200">{quotaUsed}</strong> / {quotaLimit} used
                  </>
                )}
              </span>
            </div>

            {!isAdmin ? (
              <>
                <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      quotaPercent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{quotaRemaining} requests remaining today</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Resets 00:00 UTC
                  </span>
                </div>
              </>
            ) : (
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Full access to all AI features and developer tools</span>
                <span className="text-emerald-400 text-[10px] font-medium">Active</span>
              </div>
            )}
          </div>

          {/* Subscription Tier Card */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-200 text-xs">
                  {isAdmin ? 'Admin Pass' : (subscription?.plan_name || 'Free tier')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isAdmin
                  ? 'Unlimited solves • Unlimited devices • Multi-model support'
                  : `${subscription?.ai_usage_limit || 10} req/day • ${subscription?.device_limit || 1} device sync`}
              </span>
            </div>

            {!isAdmin ? (
              <button
                onClick={() => setActiveTab('plans')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{(subscription?.plan_id || '').toUpperCase() === 'FREE' ? 'Upgrade' : 'Manage'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={async () => {
                  const webUrl = AuthService.getWebPortalUrl();
                  let url = `${webUrl}/dashboard`;
                  try {
                    const code = await AuthService.createHandoffCode();
                    url = `${webUrl}/dashboard?handoff_code=${encodeURIComponent(code)}`;
                  } catch {}
                  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url });
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
              >
                <span>Web Dashboard</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          {/* Administrator System Card */}
          {isAdmin && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-850 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-medium text-slate-200 text-xs block">Admin Console</span>
                  <span className="text-[10px] text-slate-400">
                    System controls, user management & telemetry
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  const webUrl = AuthService.getWebPortalUrl();
                  let url = `${webUrl}/admin`;
                  try {
                    const code = await AuthService.createHandoffCode();
                    url = `${webUrl}/admin?handoff_code=${encodeURIComponent(code)}`;
                  } catch {}
                  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                    chrome.tabs.create({ url });
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer shrink-0"
              >
                <span>Open Console</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}

          {/* Privacy & Product Analytics Preference */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="max-w-[210px]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-200 text-xs">Privacy & Telemetry</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                {optOutAnalytics
                  ? 'Telemetry disabled. Zero usage metrics shared.'
                  : 'Anonymous latency & crash metrics enabled.'}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Code, prompts, and keystrokes are never recorded.
              </span>
            </div>

            <button
              onClick={async () => {
                const nextVal = !optOutAnalytics;
                setOptOutAnalytics(nextVal);
                await AnalyticsService.setOptOut(nextVal);
                onNotify?.(nextVal ? 'Opted out of performance metrics.' : 'Opted into anonymous performance metrics.', false);
              }}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium text-xs transition-colors cursor-pointer border ${
                !optOutAnalytics
                  ? 'bg-slate-850 text-slate-200 border-slate-700 hover:bg-slate-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
              }`}
            >
              {!optOutAnalytics ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
              <span>{!optOutAnalytics ? 'Active' : 'Off'}</span>
            </button>
          </div>

          {/* Account Security Action */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Session ID: {user.id ? user.id.slice(0, 8) + '...' : 'local'}</span>
            <button
              onClick={logoutAll}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Log out everywhere</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PLANS & BILLING */}
      {activeTab === 'plans' && (
        <div className="p-3.5 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold text-xs">Available Passes & Plans</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { refreshSubscription(); onNotify?.('Subscription status refreshed', false); }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
                title="Refresh subscription status after payment"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Sync Status</span>
              </button>
              <span className="text-[10px] text-slate-500">• Secure Razorpay</span>
            </div>
          </div>

          {/* Anti-Account Sharing Policy Callout Banner */}
          <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/25 rounded-xl text-[10px] text-slate-300 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong className="text-white block">Strict Single-Account & Single-Device Policy</strong>
              <span>To ensure fair pricing for all students, passes are strictly bound to 1 registered device and 1 concurrent session. Account sharing is strictly prohibited and monitored.</span>
            </div>
          </div>

          {/* Promo Code & Coupon Bar */}
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Enter promo or coupon code"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 uppercase font-mono outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleRedeemPromo}
              disabled={isRedeemingPromo || !promoInput.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              {isRedeemingPromo ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {appliedCoupon && (
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-300 flex items-center justify-between">
              <span>✓ Coupon <strong>{appliedCoupon}</strong> active ({couponDiscountPercent}% discount applied at checkout)</span>
              <button onClick={() => { setAppliedCoupon(null); setCouponDiscountPercent(0); }} className="text-slate-400 hover:text-white underline">Remove</button>
            </div>
          )}

          {/* Pricing Tier Cards */}
          <div className="flex flex-col gap-2.5">
            {plans.map((p) => {
              const isCurrent = subscription?.plan_id === p.id;
              const basePrice = p.price / 100;
              const discountedPrice = couponDiscountPercent > 0 && p.price > 0
                ? Math.round(basePrice * (1 - couponDiscountPercent / 100))
                : basePrice;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-lg border flex flex-col gap-2 transition-colors ${
                    isCurrent
                      ? 'bg-slate-850/80 border-indigo-500/70 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-100 text-xs">{p.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{p.description}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-100">
                        {p.price === 0 ? 'Free' : `₹${discountedPrice}`}
                      </span>
                      {p.price > 0 && (
                        <span className="text-[9px] text-slate-400 block">
                          /{p.billing_interval || 'day'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 pt-1.5 border-t border-slate-850">
                    <span>{p.ai_usage_limit} req/day</span>
                    <span>{p.device_limit} device</span>
                    <span>{p.concurrent_session_limit} session</span>
                  </div>

                  {/* Action CTA */}
                  <div className="pt-0.5">
                    {isCurrent ? (
                      <div className="w-full py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-md text-xs font-medium flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Active plan</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgradePlan(p)}
                        disabled={checkoutLoading === p.id}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {checkoutLoading === p.id ? (
                          <span>Processing order...</span>
                        ) : (
                          <span>Upgrade</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment & Billing History Section */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Billing & Transaction History</span>
            </div>

            {payments.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center text-slate-500 text-xs">
                No past transactions found.
              </div>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block text-xs">
                      ₹{p.amount / 100} ({p.currency})
                    </span>
                    <span className="text-[10px] text-slate-500 block">{p.provider_order_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300">
                      {p.payment_status}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEVICES & SECURITY */}
      {activeTab === 'security' && (
        <div className="p-3.5 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto">
          {/* Devices Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Registered Devices</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {devices.length} / {subscription?.device_limit || 1} allowed
              </span>
            </div>

            {devices.map((d) => (
              <div
                key={d.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-850 text-slate-300">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    {editingDevice?.id === d.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingDevice.name}
                          onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveDeviceName}
                          disabled={actionLoading}
                          className="text-indigo-400 text-[10px] hover:underline cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDevice(null)}
                          className="text-slate-500 text-[10px] hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-xs">{d.device_name}</span>
                        <button
                          onClick={() => setEditingDevice({ id: d.id, name: d.device_name })}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer"
                          title="Rename Device"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      {d.browser_name} • Last seen {new Date(d.last_seen_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeDevice(d.device_id)}
                  disabled={actionLoading}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Revoke Device"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Active Sessions Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active Browser Sessions</span>
              </span>
              {sessions.length > 1 && (
                <button
                  onClick={handleTerminateOtherSessions}
                  className="text-red-400 hover:text-red-300 text-[10px] font-medium hover:underline cursor-pointer"
                >
                  Terminate other sessions
                </button>
              )}
            </div>

            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-850 text-slate-300">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200 text-xs">
                        {s.device_name || 'Chrome Browser'}
                      </span>
                      {s.is_current && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Active: {new Date(s.last_seen_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {!s.is_current && (
                  <button
                    onClick={() => handleTerminateSession(s.id)}
                    disabled={actionLoading}
                    className="px-2 py-1 bg-red-950/40 text-red-400 hover:bg-red-950 border border-red-800/50 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Terminate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUPPORT & FEEDBACK */}
      {activeTab === 'support' && (
        <div className="p-3.5 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
          {/* Sub-Tabs: Feedback vs Support Tickets */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-850 rounded-xl text-xs">
            <button
              onClick={() => setSupportSubTab('feedback')}
              className={`flex-1 py-1 px-2 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
                supportSubTab === 'feedback'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💬 Feedback & Requests
            </button>
            <button
              onClick={() => setSupportSubTab('tickets')}
              className={`flex-1 py-1 px-2 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
                supportSubTab === 'tickets'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎫 Support Helpdesk ({tickets.length})
            </button>
          </div>

          {/* SUB-TAB A: FEEDBACK & FEATURE REQUESTS */}
          {supportSubTab === 'feedback' && (
            <div className="flex flex-col gap-3">
              {/* Submit Feedback Box */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-xs">Rate & Feedback</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={feedbackCategory}
                    onChange={(e: any) => setFeedbackCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="bug_report">Bug Report</option>
                    <option value="usability">Usability</option>
                    <option value="ai_quality">AI Quality</option>
                    <option value="general">General</option>
                  </select>

                  <div className="flex items-center gap-1 justify-end">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setFeedbackScore(score)}
                        className={`w-5 h-5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          feedbackScore >= score
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                            : 'bg-slate-850 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Summary..."
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
                <textarea
                  placeholder="How can we make CodeMate AI better for you?"
                  value={feedbackDesc}
                  onChange={(e) => setFeedbackDesc(e.target.value)}
                  rows={2}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 resize-none"
                />
                <button
                  onClick={async () => {
                    if (feedbackTitle.length < 3 || feedbackDesc.length < 10) {
                      onNotify?.('Title must be at least 3 chars and description 10 chars.', true);
                      return;
                    }
                    try {
                      await FeedbackSupportService.submitFeedback({
                        category: feedbackCategory,
                        title: feedbackTitle,
                        description: feedbackDesc,
                        satisfaction_score: feedbackScore,
                      });
                      onNotify?.('Thank you! Feedback received.', false);
                      setFeedbackTitle('');
                      setFeedbackDesc('');
                    } catch (err: any) {
                      onNotify?.(err.message || 'Failed to submit feedback', true);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm shadow-indigo-600/20"
                >
                  Submit Feedback
                </button>
              </div>

              {/* Community Feature Requests */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-200 text-xs">Feature Proposals</span>
                <button
                  onClick={() => setShowNewFrForm(!showNewFrForm)}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showNewFrForm ? 'Cancel' : 'Propose Feature'}</span>
                </button>
              </div>

              {showNewFrForm && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Feature title..."
                    value={newFrTitle}
                    onChange={(e) => setNewFrTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                  <select
                    value={newFrCategory}
                    onChange={(e) => setNewFrCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                  >
                    <option value="ai_features">AI Autopilot & Code Generation</option>
                    <option value="editor_integration">Editor Integration & Clipboard</option>
                    <option value="project_intelligence">Multi-File Project Architecture</option>
                    <option value="ui_ux">UI & Themes</option>
                    <option value="performance">Speed & Latency</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    placeholder="Describe how this feature would streamline your workflow..."
                    value={newFrDesc}
                    onChange={(e) => setNewFrDesc(e.target.value)}
                    rows={2}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 resize-none"
                  />
                  <button
                    onClick={async () => {
                      if (newFrTitle.length < 5 || newFrDesc.length < 15) {
                        onNotify?.('Title min 5 chars, description min 15 chars.', true);
                        return;
                      }
                      try {
                        await FeedbackSupportService.createFeatureRequest({
                          title: newFrTitle,
                          description: newFrDesc,
                          category: newFrCategory,
                        });
                        onNotify?.('Feature request published!', false);
                        setNewFrTitle('');
                        setNewFrDesc('');
                        setShowNewFrForm(false);
                        const updated = await FeedbackSupportService.listFeatureRequests();
                        setFeatureRequests(updated);
                      } catch (err: any) {
                        onNotify?.(err.message || 'Failed to publish feature request', true);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Publish Proposal
                  </button>
                </div>
              )}

              {/* List of Feature Requests */}
              <div className="flex flex-col gap-2">
                {featureRequests.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 text-xs">{fr.title}</span>
                        <span className="px-1.5 py-0.2 bg-slate-850 text-slate-400 rounded text-[9px] font-semibold">
                          {fr.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{fr.description}</p>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          if (fr.has_voted) {
                            await FeedbackSupportService.unvoteFeatureRequest(fr.id);
                          } else {
                            await FeedbackSupportService.voteFeatureRequest(fr.id);
                          }
                          const updated = await FeedbackSupportService.listFeatureRequests();
                          setFeatureRequests(updated);
                        } catch (err: any) {
                          onNotify?.(err.message || 'Vote update failed', true);
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer ${
                        fr.has_voted
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{fr.vote_count}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB B: CUSTOMER SUPPORT TICKETS */}
          {supportSubTab === 'tickets' && (
            <div className="flex flex-col gap-2.5">
              {!selectedUserTicket ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">Support Tickets</span>
                    <button
                      onClick={() => setShowNewTicketForm(!showNewTicketForm)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{showNewTicketForm ? 'Cancel' : 'New Ticket'}</span>
                    </button>
                  </div>

                  {showNewTicketForm && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Subject..."
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                        >
                          <option value="account_access">Account Access</option>
                          <option value="billing_payment">Billing & Payment</option>
                          <option value="ai_functionality">AI Autopilot & Generation</option>
                          <option value="editor_integration">Editor Integration</option>
                          <option value="bug_report">Bug Report</option>
                          <option value="general_support">General Support</option>
                        </select>
                        <select
                          value={ticketPriority}
                          onChange={(e: any) => setTicketPriority(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                        >
                          <option value="LOW">LOW</option>
                          <option value="NORMAL">NORMAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="Describe the issue you encountered..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        rows={2}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 resize-none"
                      />
                      <button
                        onClick={async () => {
                          if (ticketSubject.length < 5 || ticketMessage.length < 10) {
                            onNotify?.('Subject min 5 chars, message min 10 chars.', true);
                            return;
                          }
                          try {
                            const newT = await FeedbackSupportService.createTicket({
                              subject: ticketSubject,
                              category: ticketCategory,
                              priority: ticketPriority,
                              initial_message: ticketMessage,
                            });
                            onNotify?.('Support ticket created successfully.', false);
                            setTicketSubject('');
                            setTicketMessage('');
                            setShowNewTicketForm(false);
                            const updated = await FeedbackSupportService.listMyTickets();
                            setTickets(updated);
                            setSelectedUserTicket(newT);
                          } catch (err: any) {
                            onNotify?.(err.message || 'Failed to create support ticket', true);
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-1.5 text-xs font-semibold cursor-pointer shadow-sm shadow-indigo-600/20"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  )}

                  {/* Tickets List */}
                  <div className="flex flex-col gap-2">
                    {tickets.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">You have no active support tickets.</div>
                    ) : (
                      tickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={async () => {
                            const full = await FeedbackSupportService.getTicketDetails(t.id);
                            setSelectedUserTicket(full);
                          }}
                          className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-200 block text-xs">{t.subject}</span>
                            <span className="text-[10px] text-slate-500 block">
                              Priority: {t.priority} • {new Date(t.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              t.status === 'OPEN'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.status.charAt(0).toUpperCase() + t.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* Ticket Thread View */
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setSelectedUserTicket(null)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 self-start font-medium cursor-pointer"
                  >
                    ← Back to Tickets
                  </button>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="font-semibold text-slate-200 text-xs block">{selectedUserTicket.subject}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Status: <strong className="text-slate-300">{selectedUserTicket.status}</strong> • Priority: {selectedUserTicket.priority}
                    </span>
                  </div>

                  {/* Messages Thread */}
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {selectedUserTicket.messages?.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border ${
                          (m.sender_role || '').toUpperCase() === 'USER'
                            ? 'bg-slate-950 border-slate-800 text-slate-200 self-end ml-4'
                            : 'bg-indigo-950/30 border-indigo-800/60 text-indigo-100 self-start mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-semibold">{(m.sender_role || '').toUpperCase() === 'USER' ? 'You' : 'CodeMate Support'}</span>
                          <span className="text-slate-500">{new Date(m.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{m.message_text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Type a response to support..."
                      value={userReplyText}
                      onChange={(e) => setUserReplyText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      onClick={async () => {
                        if (!userReplyText.trim()) return;
                        try {
                          await FeedbackSupportService.replyToTicket(selectedUserTicket.id, userReplyText);
                          setUserReplyText('');
                          const updated = await FeedbackSupportService.getTicketDetails(selectedUserTicket.id);
                          setSelectedUserTicket(updated);
                        } catch (err: any) {
                          onNotify?.(err.message || 'Failed to send reply', true);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer shadow-sm shadow-indigo-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
