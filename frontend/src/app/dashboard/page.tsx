"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AppSidebar,
  TabKey,
} from "@/components/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { KPICard } from "@/components/KPICard";
import { ExtensionSyncCard } from "@/components/ExtensionSyncCard";
import { DeviceManager } from "@/components/DeviceManager";
import { PricingTable } from "@/components/PricingTable";
import { AdminConsole } from "@/components/AdminConsole";
import { SupportDesk } from "@/components/SupportDesk";
import { TelemetryChart } from "@/components/TelemetryChart";
import { AIWorkspacePlayground } from "@/components/AIElements";
import { useAuth } from "@/lib/auth-context";
import {
  subscriptionApi,
  SubscriptionSummary,
  fetchWithAuth,
  parseErrorMessage,
  PLAN_FREE,
  PLAN_CORE_PASS,
  PLAN_AUTOPILOT_PASS,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  Laptop,
  CreditCard,
  User,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading, isAdmin, isSupport, resendVerification, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Redirect to /login if unauthenticated
  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  // Handle URL ?tab= deep links
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab")?.toLowerCase();
      if (tabParam === "plans" || tabParam === "pricing" || tabParam === "billing") {
        setActiveTab("billing");
      } else if (tabParam === "admin") {
        setActiveTab("admin");
      } else if (tabParam === "devices") {
        setActiveTab("devices");
      } else if (tabParam === "support") {
        setActiveTab("support");
      } else if (tabParam === "sync") {
        setActiveTab("sync");
      } else if (tabParam === "settings") {
        setActiveTab("settings");
      } else if (tabParam === "overview") {
        setActiveTab("overview");
      }
    }
  }, []);

  // Load subscription details
  useEffect(() => {
    if (token) {
      setLoadingSub(true);
      subscriptionApi
        .getMySubscription()
        .then((res) => setSubscription(res))
        .catch(() => {
          // ignore if new user with free plan
        })
        .finally(() => setLoadingSub(false));
    }
  }, [token]);

  const handleResendVerification = async () => {
    try {
      setVerifying(true);
      await resendVerification();
      toast.success("Verification link sent! Please check your email inbox.");
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to send verification email."));
    } finally {
      setVerifying(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("This will sign out all browsers and extensions linked to your account.")) return;
    try {
      await fetchWithAuth("/api/auth/logout-all", { method: "POST" });
      toast.success("All sessions have been revoked.");
      await logout();
      router.push("/login");
    } catch (err) {
      toast.error(parseErrorMessage(err));
    }
  };

  if (isLoading || (!user && token)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs font-mono">Authenticating CodeMate Session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isPaid =
    subscription?.status === "active" &&
    (subscription.plan_id === PLAN_CORE_PASS ||
      subscription.plan_id === PLAN_AUTOPILOT_PASS ||
      subscription.plan_id === "core_daily" ||
      subscription.plan_id === "autopilot_weekly");
  const quotaDisplay = isPaid
    ? "Unlimited"
    : `${subscription?.daily_ai_solves_used || 0} / ${subscription?.ai_usage_limit || 500}`;
  const quotaProgress = isPaid
    ? 100
    : Math.min(100, Math.round(((subscription?.daily_ai_solves_used || 0) / (subscription?.ai_usage_limit || 500)) * 100));

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100">
        {/* Shadcn Sidebar */}
        <AppSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header Bar */}
          <header className="h-16 px-6 lg:px-8 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-zinc-400 hover:text-white cursor-pointer" />
              <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
              <h1 className="text-sm font-semibold text-white capitalize tracking-tight">
                {activeTab === "overview" && "Workspace Telemetry"}
                {activeTab === "sync" && "Extension Cloud Synchronization"}
                {activeTab === "devices" && "Registered Hardware Devices"}
                {activeTab === "billing" && "Subscription & Billing Plans"}
                {activeTab === "settings" && "Account & Security Controls"}
                {activeTab === "admin" && "Administrative System Console"}
                {activeTab === "support" && "Help & Ticket Queue"}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium font-mono">API Operational</span>
              </div>

              <div className="h-4 w-px bg-white/[0.1]" />

              <div className="text-xs text-zinc-400 font-mono">
                v2.4.0 <span className="text-zinc-600">•</span> prod
              </div>
            </div>
          </header>

          {/* Content Container */}
          <main className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Email Verification Alert Banner (if unverified) */}
            {!user.email_verified && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Your email <strong>{user.email}</strong> is unverified. All AI generation features require a verified email. Please check your inbox.
                  </span>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 text-xs shrink-0"
                >
                  {verifying ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    title="Daily AI Solves"
                    value={quotaDisplay}
                    subtitle={isPaid ? "Unlimited High-Speed Quota" : "Resets daily at 00:00 UTC"}
                    progress={quotaProgress}
                    badge={{
                      text: isPaid ? "Unlimited" : "Active",
                      variant: isPaid ? "indigo" : "default",
                    }}
                  />

                  <KPICard
                    title="Current Tier"
                    value={subscription?.plan_name || "Free Tier"}
                    subtitle={
                      isPaid
                        ? `Valid until ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "Active"}`
                        : "Upgrade to Core Pass for unlimited access"
                    }
                    badge={{
                      text: isPaid ? "Paid Active" : "Free Plan",
                      variant: isPaid ? "success" : "default",
                    }}
                    onClick={() => setActiveTab("billing")}
                  />

                  <KPICard
                    title="Registered Devices"
                    value={`1 / ${subscription?.device_limit || 1}`}
                    subtitle="Hardware Bound Extension Slots"
                    badge={{ text: "Hardware Bound", variant: "default" }}
                    onClick={() => setActiveTab("devices")}
                  />

                  <KPICard
                    title="Gateway Latency"
                    value="118 ms"
                    subtitle="Fastest route to Gemini 2.5 Flash"
                    badge={{ text: "Sub-Second", variant: "success" }}
                  />
                </div>

                {/* Shadcn Telemetry Chart (Volume & Latency over time) */}
                <TelemetryChart />

                {/* 1-Click Extension Sync Card */}
                <ExtensionSyncCard />

                {/* AI Elements Playground */}
                <AIWorkspacePlayground />
              </div>
            )}

            {/* TAB 2: EXTENSION SYNC */}
            {activeTab === "sync" && <ExtensionSyncCard />}

            {/* TAB 3: DEVICES */}
            {activeTab === "devices" && <DeviceManager />}

            {/* TAB 4: BILLING */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <PricingTable
                  currentSub={subscription}
                  onSuccess={() => {
                    subscriptionApi.getMySubscription().then(setSubscription);
                  }}
                />
              </div>
            )}

            {/* TAB 5: SETTINGS */}
            {activeTab === "settings" && (
              <div className="max-w-2xl space-y-6">
                <Card className="bg-zinc-950/80 border-white/[0.08]">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-400" />
                      <span>Account Profile</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Full Name</span>
                        <span className="font-medium text-white">{user.display_name}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Email Address</span>
                        <span className="font-mono text-white">{user.email}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Account Role</span>
                        <span className="font-mono text-indigo-400 uppercase">{user.role}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Account Status</span>
                        <span className="font-mono text-emerald-400 uppercase">{user.account_status}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-950/80 border-white/[0.08]">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Session Security</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      If you suspect unauthorized activity or want to sign out everywhere:
                    </p>
                    <button
                      onClick={handleLogoutAll}
                      className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs font-semibold transition cursor-pointer"
                    >
                      Terminate All Sessions &amp; Revoke Everywhere
                    </button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 6: ADMIN */}
            {activeTab === "admin" && isAdmin && <AdminConsole />}

            {/* TAB 7: SUPPORT */}
            {activeTab === "support" && <SupportDesk />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
