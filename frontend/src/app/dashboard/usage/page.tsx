"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { subscriptionApi, SubscriptionSummary, PLAN_FREE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CustomerUsagePage() {
  const { user } = useAuth();
  const [sub, setSub] = React.useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchUsage = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await subscriptionApi.getMySubscription();
      setSub(data);
    } catch (err) {
      console.error("Failed to load subscription usage:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const used = sub?.daily_ai_solves_used ?? 0;
  const limit = sub?.ai_usage_limit ?? 5;
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((used / (limit || 1)) * 100));

  const featureEstimates = [
    { name: "Single-File Problem Solves", share: "55%", description: "Direct algorithm code generation from challenge descriptions" },
    { name: "Syntax AST & Error Repair", share: "25%", description: "Compiler runner subprocess diagnostics & automatic patch repair" },
    { name: "Code Optimization & Complexity", share: "12%", description: "Time and space complexity profiling and runtime optimization" },
    { name: "Multi-File Dependency Reasoning", share: "8%", description: "Inter-module contract graph analysis & multi-file patches" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Usage & Activity</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitor your daily solve quotas, request allocation, and execution velocity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsage}
          disabled={refreshing}
          className="h-8 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Daily AI Solves Used</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{used}</span>
            <span className="text-xs text-muted-foreground font-mono">/ {limit}</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            {pct}% of daily limit consumed
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Solves Remaining</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-500">{remaining}</span>
            <span className="text-xs text-muted-foreground font-mono">available</span>
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Refreshes automatically at 00:00 UTC
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Active Reasoning Engine</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-primary uppercase">DeepSeek</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            deepseek-flash (Zero Latency Queue)
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Plan Quota Tier</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-foreground">
              {sub?.plan_name ? sub.plan_name.replace("PLAN_", "").replace("_", " ") : "Free Tier"}
            </span>
          </div>
          <Link
            href="/dashboard/subscription"
            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Upgrade quotas</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Progress & Quota Bar */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">Daily Allowance Trajectory</h3>
            <p className="text-xs text-muted-foreground">Server-enforced quota for your individual developer plan</p>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">
            {used} / {limit} Solves
          </span>
        </div>

        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>0 solves</span>
          <span>50%</span>
          <span>{limit} solves (Cap)</span>
        </div>
      </div>

      {/* Feature Breakdown Table */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Supported AI Capabilities</h3>
          <span className="text-xs font-mono text-muted-foreground">Capabilities</span>
        </div>

        <div className="divide-y divide-border/60">
          {featureEstimates.map((f, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-1">
              <div>
                <span className="font-medium text-xs text-foreground block">{f.name}</span>
                <span className="text-[11px] text-muted-foreground">{f.description}</span>
              </div>
              <span className="font-mono text-xs text-primary font-semibold self-start sm:self-auto">
                {f.share}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Shield className="size-4 text-emerald-500" />
          <span>Privacy & Code Confidentiality Standard</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          CodeMate AI does not persist, index, or train models on your private problem prompts, test cases, or source code. Solves are processed transiently in-memory and all analytics metrics reflect request counts and token telemetry only.
        </p>
      </div>
    </div>
  );
}

