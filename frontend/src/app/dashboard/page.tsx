"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  CreditCard,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  subscriptionApi,
  SubscriptionSummary,
  devicesApi,
  DeviceItem,
  PLAN_FREE,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, resendVerification } = useAuth();
  const [subscription, setSubscription] = React.useState<SubscriptionSummary | null>(null);
  const [devices, setDevices] = React.useState<DeviceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [verificationSent, setVerificationSent] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [subData, devicesData] = await Promise.allSettled([
        subscriptionApi.getMySubscription(),
        devicesApi.list(),
      ]);

      if (subData.status === "fulfilled") setSubscription(subData.value);
      if (devicesData.status === "fulfilled") setDevices(devicesData.value);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResend = async () => {
    try {
      setVerifying(true);
      await resendVerification();
      setVerificationSent(true);
    } catch (err) {
      console.error("Failed to resend verification:", err);
    } finally {
      setVerifying(false);
    }
  };

  const isPaid = subscription && subscription.plan_id !== PLAN_FREE && subscription.status === "active";
  const used = subscription?.daily_ai_solves_used ?? 0;
  const limit = subscription?.ai_usage_limit ?? 5;
  const remaining = Math.max(0, limit - used);
  const quotaPercent = Math.min(100, Math.round((used / (limit || 1)) * 100));

  const activeDeviceCount = devices.filter((d) => d.device_status === "active").length;

  return (
    <div className="space-y-6">
      {/* Unverified Email Warning Banner */}
      {user && !user.email_verified && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <span className="text-foreground">
              Your email <span className="font-mono font-medium">{user.email}</span> is unverified. Verify your address to secure subscription recovery.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={verifying || verificationSent}
            className="text-xs h-7 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 shrink-0 self-start sm:self-auto"
          >
            {verificationSent ? "Email Sent!" : verifying ? "Sending..." : "Resend Link"}
          </Button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Welcome back, {user?.display_name || "Developer"}
              </h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                {subscription?.plan_name ? subscription.plan_name.replace("PLAN_", "") : "FREE"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Account ID: <span className="font-mono">{user?.id?.slice(0, 12)}...</span> • Member since{" "}
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "2026"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            {!isPaid && (
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/subscription")}
                className="h-8 gap-1.5 text-xs shadow-xs"
              >
                <Sparkles className="size-3.5" />
                <span>Upgrade Plan</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* High-Density Overview KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Daily Quota Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Daily AI Solves</span>
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {used} / {limit}
              </span>
              <span className="text-xs text-muted-foreground font-mono">used</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${
                  quotaPercent > 90 ? "bg-rose-500" : quotaPercent > 70 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {remaining} solves remaining today
          </span>
        </div>

        {/* Active Plan Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Subscription Tier</span>
            <CreditCard className="size-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-xl font-bold font-mono text-foreground block">
              {subscription?.plan_name ? subscription.plan_name.replace("PLAN_", "").replace("_", " ") : "Free Tier"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Status: <span className="text-emerald-500 uppercase font-semibold">{subscription?.status || "ACTIVE"}</span>
            </span>
          </div>
          <Link
            href="/dashboard/subscription"
            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Manage billing & limits</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Registered Devices Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Extension Devices</span>
            <Laptop className="size-4 text-sky-500" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-foreground">
              {activeDeviceCount} / {subscription?.device_limit ?? 1}
            </span>
            <span className="text-xs text-muted-foreground font-mono block">Registered devices</span>
          </div>
          <Link
            href="/dashboard/devices"
            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Inspect devices & sessions</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Quota Reset Schedule */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Quota Refresh</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-foreground">
              00:00 UTC
            </span>
            <span className="text-xs text-muted-foreground block">Daily auto-reset</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Limits replenish every midnight
          </span>
        </div>
      </div>

      {/* Main Grid: Extension Setup & Quick Navigation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chrome Extension Integration Guide */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Chrome Extension Pairing</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">v1.0.0 Ready</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            CodeMate AI operates directly inside your browser alongside LeetCode, HackerRank, Codeforces, and web IDEs. Pair your account with the extension for instant code generation, AST syntax debugging, and multi-file reasoning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="font-mono text-xs font-bold text-foreground block">1. Install</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Load the CodeMate extension in Chrome Developer Mode or Chrome Web Store.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="font-mono text-xs font-bold text-foreground block">2. Connect</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Click &quot;Connect to Portal&quot; inside the extension popup to bind your device.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="font-mono text-xs font-bold text-foreground block">3. Solve</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Trigger Side Panel (<span className="font-mono text-[10px]">Ctrl+Shift+U</span>) on any coding challenge.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/devices"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Laptop className="size-3.5" />
              <span>Manage Connected Devices</span>
            </Link>
            <Link
              href="/dashboard/usage"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Activity className="size-3.5 text-muted-foreground" />
              <span>View Usage Activity</span>
            </Link>
          </div>
        </div>

        {/* Quick Account Shortcuts */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Account Shortcuts</h3>
              <span className="text-xs font-mono text-muted-foreground">Self-Service</span>
            </div>

            <div className="mt-4 space-y-2.5">
              <Link
                href="/dashboard/subscription"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <span className="font-medium text-foreground">Upgrade / Change Plan</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/billing"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-emerald-500" />
                  <span className="font-medium text-foreground">Payment Receipts & History</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/support"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-sky-500" />
                  <span className="font-medium text-foreground">Contact Support Desk</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/security"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-amber-500" />
                  <span className="font-medium text-foreground">Password & Active Sessions</span>
                </div>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-primary/5 p-3 border border-primary/20 text-xs">
            <span className="font-semibold text-primary block">Individual Developer SaaS</span>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Direct access to DeepSeek reasoning models, compiler sandbox repair, and AST analysis.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
