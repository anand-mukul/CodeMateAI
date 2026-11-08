"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Zap,
  Calendar,
  AlertCircle,
  RefreshCw,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PricingTable } from "@/components/PricingTable";
import { useAuth } from "@/lib/auth-context";
import {
  subscriptionApi,
  SubscriptionSummary,
  PLAN_FREE,
} from "@/lib/api";
import { toast } from "sonner";

export default function UserSubscriptionPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
  }, [isLoading, token, router]);

  const loadSub = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await subscriptionApi.getMySubscription();
      setSubscription(data);
    } catch (err) {
      console.error("Failed to load subscription:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadSub();
    }
  }, [token, loadSub]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your paid plan? You will retain access until the end of your billing cycle.")) {
      return;
    }
    try {
      setCanceling(true);
      await subscriptionApi.cancel();
      toast.success("Subscription canceled. You have access until the end of this billing period.");
      await loadSub();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const isPaid = subscription && subscription.plan_id !== PLAN_FREE && subscription.status === "active";
  const used = subscription?.daily_ai_solves_used ?? 0;
  const limit = subscription?.ai_usage_limit ?? 5;
  const pct = Math.min(100, Math.round((used / (limit || 1)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Subscription & Quotas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your individual developer plan, daily AI request quotas, and billing status.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSub}
          disabled={refreshing}
          className="h-8 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

        {/* Current Plan Overview Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Plan</span>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold font-mono text-foreground">
                  {subscription?.plan_name || "Free Developer Tier"}
                </h2>
                <Badge
                  variant={isPaid ? "default" : "secondary"}
                  className="text-[10px] font-mono uppercase tracking-wider"
                >
                  {subscription?.status || "ACTIVE"}
                </Badge>
              </div>
            </div>

            {isPaid && (
              <div className="flex items-center gap-3">
                {subscription?.cancel_at_period_end ? (
                  <span className="text-xs text-amber-500 font-medium">Cancels at period end</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={canceling}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <XCircle className="mr-1.5 size-3.5" />
                    <span>{canceling ? "Canceling..." : "Cancel Plan"}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quota Progress & Quota Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-primary" />
                  Daily AI Problem-Solving Quota
                </span>
                <span className="font-mono text-muted-foreground">
                  {used} / {limit} solves ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground block">
                Usage resets automatically every 24 hours at 00:00 UTC.
              </span>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 border border-border/50 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device Limit</span>
                <span className="font-mono font-bold text-foreground">
                  {subscription?.device_limit ?? 1} Device(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concurrent Sessions</span>
                <span className="font-mono font-bold text-foreground">
                  {subscription?.concurrent_session_limit ?? 1} Session(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Period</span>
                <span className="font-mono text-foreground">
                  {subscription?.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : "Continuous"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade / Change Plan Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Available Plans</h2>
              <p className="text-xs text-muted-foreground">
                Upgrade to unlock higher daily quotas, multi-file reasoning, and priority AST compilation.
              </p>
            </div>
          </div>

          <PricingTable currentSub={subscription} onSuccess={loadSub} />
        </div>
    </div>
  );
}
