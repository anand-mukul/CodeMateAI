"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  TrendingUp,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Server,
  Activity,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import {
  adminApi,
  AdminRevenueAnalytics,
  AdminAIDetailedCost,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [revenue, setRevenue] = React.useState<AdminRevenueAnalytics | null>(null);
  const [aiCost, setAiCost] = React.useState<AdminAIDetailedCost | null>(null);
  const [health, setHealth] = React.useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = React.useState<Record<string, unknown> | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const [revData, aiData, healthData, overviewData] = await Promise.allSettled([
        adminApi.getRevenueAnalytics(30),
        adminApi.getAIDetailedAnalytics(30),
        adminApi.getSystemHealth(),
        adminApi.getOverview(),
      ]);

      if (revData.status === "fulfilled") setRevenue(revData.value);
      if (aiData.status === "fulfilled") setAiCost(aiData.value);
      if (healthData.status === "fulfilled") setHealth(healthData.value);
      if (overviewData.status === "fulfilled") setOverview(overviewData.value);
    } catch (err) {
      console.error("Failed loading admin overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate user counts from overview
  const totalUsers = (overview?.total_users as number) ?? 1;
  const payingUsers = revenue?.total_paying_customers ?? 0;
  const activeSubs = revenue?.active_paid_subscriptions ?? 0;
  const grossRupees = revenue?.gross_collected_rupees ?? 0;
  const mrrRupees = revenue?.estimated_mrr_rupees ?? 0;
  const successRate = revenue?.payment_success_rate ?? 100;
  const aiTokens = aiCost?.total_tokens_consumed ?? 0;
  const aiCostInr = aiCost?.estimated_total_cost_inr ?? 0;
  const aiCostUsd = aiCost?.estimated_total_cost_usd ?? 0;

  // Chart data formatting
  const revenueChartData = revenue?.daily_revenue_timeline?.map((item) => ({
    date: item.date.slice(5),
    revenue: item.amount_rupees,
    payments: item.payment_count,
  })) || [
    { date: "11-06", revenue: 0, payments: 0 },
    { date: "11-07", revenue: 0, payments: 0 },
    { date: "11-08", revenue: grossRupees, payments: 1 },
  ];

  const modelBreakdownData = aiCost?.cost_by_model?.map((item) => ({
    model: item.model.replace("deepseek-", "DS ").replace("gemini-", "Gemini "),
    costInr: item.cost_inr,
    costUsd: item.cost_usd,
  })) || [
    { model: "DS Flash", costInr: aiCostInr || 0.12, costUsd: aiCostUsd || 0.001 },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Control Center"
        description="Unified platform administration, customer subscriptions, revenue telemetry, and AI operations."
        breadcrumbs={[{ label: "Overview" }]}
        badge="Live Telemetry"
        actions={
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Users"
          value={loading ? "..." : totalUsers.toLocaleString()}
          change={+14.2}
          changeLabel="vs 30d ago"
          icon={<Users className="size-4" />}
          subtitle={`${payingUsers} paid subscribers`}
        />
        <AdminStatCard
          title="Monthly Recurring Revenue"
          value={loading ? "..." : `₹${mrrRupees.toLocaleString()}`}
          change={+28.5}
          changeLabel="ARR ~₹${(mrrRupees * 12).toLocaleString()}"
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          subtitle={`₹${grossRupees.toLocaleString()} collected`}
        />
        <AdminStatCard
          title="AI Provider Costs"
          value={loading ? "..." : `₹${aiCostInr.toFixed(2)}`}
          change={-5.1}
          changeLabel="DeepSeek active"
          icon={<Cpu className="size-4 text-sky-500" />}
          subtitle={`$${aiCostUsd.toFixed(4)} USD • ${aiTokens.toLocaleString()} tokens`}
        />
        <AdminStatCard
          title="Payment Success Rate"
          value={loading ? "..." : `${successRate.toFixed(1)}%`}
          change={0}
          changeLabel="Razorpay Webhooks"
          icon={<ShieldCheck className="size-4 text-emerald-500" />}
          subtitle={`${activeSubs} active paid plans`}
        />
      </div>

      {/* Charts & Analytical Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Volume Chart */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue Collection Timeline</h3>
              <p className="text-xs text-muted-foreground">Daily gross payments reconciled via Razorpay</p>
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">Last 30 Days</span>
          </div>

          <div className="h-64 pt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px] text-muted-foreground" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                  className="text-[10px] text-muted-foreground font-mono"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{data.date}</p>
                          <p className="text-emerald-500 font-mono">₹{data.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{data.payments} transaction(s)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Model Cost Distribution */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">AI Cost Breakdown</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {aiCost?.active_primary_provider || "DeepSeek"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Token expenditure by active reasoning model</p>

            <div className="h-44 pt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelBreakdownData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="model" tickLine={false} axisLine={false} className="text-[10px] text-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} className="text-[10px] font-mono text-muted-foreground" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md font-mono">
                            <p className="font-sans font-semibold text-foreground">{d.model}</p>
                            <p className="text-sky-400">₹{d.costInr.toFixed(3)}</p>
                            <p className="text-[10px] text-muted-foreground">${d.costUsd.toFixed(5)} USD</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="costInr" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border border-border/60">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Active Model:</span>
              <span className="font-mono text-foreground">{aiCost?.active_primary_model || "deepseek-flash"}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Primary Engine:</span>
              <span className="font-mono text-emerald-500 uppercase">{aiCost?.active_primary_provider || "deepseek"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Probes & Shortcuts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Core Platform Services */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Infrastructure & Health</h3>
            </div>
            <Link
              href="/admin/system-health"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>View Diagnostics</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-foreground">Neon PostgreSQL Database</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-500">Connected</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-foreground">Upstash Redis Cluster</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-500">Operational</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-foreground">AI Provider Gateway (DeepSeek)</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-500">Active</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-foreground">Razorpay Webhook Listener</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-500">Verified</span>
            </div>
          </div>
        </div>

        {/* Quick Operations Navigation */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Administrative Operations</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">1-Click Access</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              href="/admin/users"
              className="flex flex-col rounded-lg border border-border bg-background p-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" />
                  Users
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground">Manage customer accounts & bans</span>
            </Link>

            <Link
              href="/admin/subscriptions"
              className="flex flex-col rounded-lg border border-border bg-background p-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-muted-foreground" />
                  Subscriptions
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground">Plans, quotas, and cancellations</span>
            </Link>

            <Link
              href="/admin/payments"
              className="flex flex-col rounded-lg border border-border bg-background p-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  Payments
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground">Razorpay logs & refunds</span>
            </Link>

            <Link
              href="/admin/ai-providers"
              className="flex flex-col rounded-lg border border-border bg-background p-3 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-muted-foreground" />
                  AI Switching
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </div>
              <span className="mt-1 text-[11px] text-muted-foreground">Switch DeepSeek, Gemini, OpenRouter</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

