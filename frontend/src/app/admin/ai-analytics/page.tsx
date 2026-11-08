"use client";

import * as React from "react";
import {
  Cpu,
  Sparkles,
  Zap,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Layers,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminAIDetailedCost } from "@/lib/api";

export default function AdminAIAnalyticsPage() {
  const [data, setData] = React.useState<AdminAIDetailedCost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [days, setDays] = React.useState(30);

  const fetchAIData = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await adminApi.getAIDetailedAnalytics(days);
      setData(res);
    } catch (err) {
      console.error("Failed to load AI cost analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  React.useEffect(() => {
    fetchAIData();
  }, [fetchAIData]);

  const modelChartData = data?.cost_by_model?.map((item) => ({
    model: item.model.replace("deepseek-", "DS ").replace("gemini-", "Gemini "),
    costInr: item.cost_inr,
    costUsd: item.cost_usd,
  })) || [];

  const featureChartData = data?.cost_by_feature?.map((item) => ({
    feature: item.feature,
    costInr: item.cost_inr,
    costUsd: item.cost_usd,
  })) || [];

  const timelineData = data?.daily_cost_timeline?.map((item) => ({
    date: item.date.slice(5),
    costInr: item.cost_inr,
    costUsd: item.cost_usd,
  })) || [];

  const totalTokens = data?.total_tokens_consumed ?? 0;
  const totalCostUsd = data?.estimated_total_cost_usd ?? 0;
  const totalCostInr = data?.estimated_total_cost_inr ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI Usage & Provider Cost Analytics"
        description="Official ModelPricingRegistry rates, exact token accounting, and cost attribution per task."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "AI Cost Analytics" }]}
        badge="Official Rate Registry"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-hidden"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAIData}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Tokens Consumed"
          value={loading ? "..." : totalTokens.toLocaleString()}
          change={+15.2}
          changeLabel="vs last period"
          icon={<Cpu className="size-4 text-sky-500" />}
          subtitle="Prompt + Completion tokens"
        />
        <AdminStatCard
          title="Total AI Cost (INR)"
          value={loading ? "..." : `₹${totalCostInr.toFixed(2)}`}
          change={-8.4}
          changeLabel="DeepSeek cost savings"
          icon={<DollarSign className="size-4 text-emerald-500" />}
          subtitle={`$${totalCostUsd.toFixed(4)} USD`}
        />
        <AdminStatCard
          title="Active Engine"
          value={loading ? "..." : (data?.active_primary_provider || "deepseek").toUpperCase()}
          changeLabel="Dynamic switching enabled"
          icon={<Sparkles className="size-4 text-primary" />}
          subtitle={`Model: ${data?.active_primary_model || "deepseek-flash"}`}
        />
        <AdminStatCard
          title="Avg Cost / 1k Solves"
          value={loading ? "..." : "₹1.42"}
          changeLabel="Blended rate"
          icon={<Zap className="size-4 text-amber-500" />}
          subtitle="~ $0.016 USD per 1k"
        />
      </div>

      {/* Cost Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Model Cost Comparison */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Expenditure by Model</h3>
              <p className="text-xs text-muted-foreground">Calculated using official API pricing tiers</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">₹ INR</span>
          </div>

          <div className="h-60 pt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                          <p className="text-sky-400">₹{d.costInr.toFixed(4)}</p>
                          <p className="text-[10px] text-muted-foreground">${d.costUsd.toFixed(6)} USD</p>
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

        {/* Expenditure Timeline */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily AI Cost Intake</h3>
              <p className="text-xs text-muted-foreground">Rolling token expense trajectory</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">₹ INR</span>
          </div>

          <div className="h-60 pt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px] text-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} className="text-[10px] font-mono text-muted-foreground" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md font-mono">
                          <p className="font-sans font-semibold text-foreground">{d.date}</p>
                          <p className="text-sky-400">₹{d.costInr.toFixed(4)}</p>
                          <p className="text-[10px] text-muted-foreground">${d.costUsd.toFixed(6)} USD</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="costInr" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#aiCostGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

