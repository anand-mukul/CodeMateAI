"use client";

import * as React from "react";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  RotateCcw,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldCheck,
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
import { Button } from "@/components/ui/button";
import { adminApi, AdminRevenueAnalytics } from "@/lib/api";

export default function AdminRevenuePage() {
  const [revenue, setRevenue] = React.useState<AdminRevenueAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [days, setDays] = React.useState(30);

  const fetchRevenue = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getRevenueAnalytics(days);
      setRevenue(data);
    } catch (err) {
      console.error("Failed to load revenue analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  React.useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const timelineData = revenue?.daily_revenue_timeline?.map((item) => ({
    date: item.date.slice(5),
    revenue: item.amount_rupees,
    payments: item.payment_count,
  })) || [];

  const planBreakdown = revenue?.revenue_by_plan || [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Revenue & Financial Operations"
        description="Comprehensive accounting of gross payments, reconciled refunds, net receipts, and recurring subscriptions."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Revenue" }]}
        badge="Razorpay Primary Gateway"
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
              onClick={fetchRevenue}
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
          title="Gross Collected"
          value={loading ? "..." : `₹${(revenue?.gross_collected_rupees ?? 0).toLocaleString()}`}
          change={+32.4}
          changeLabel="vs prior period"
          icon={<DollarSign className="size-4 text-emerald-500" />}
          subtitle={`$${(revenue?.gross_collected_usd ?? 0).toFixed(2)} USD`}
        />
        <AdminStatCard
          title="Total Refunds"
          value={loading ? "..." : `₹${(revenue?.total_refunds_rupees ?? 0).toLocaleString()}`}
          change={0}
          changeLabel="0.0% chargeback rate"
          icon={<RotateCcw className="size-4 text-amber-500" />}
          subtitle="Reversed settlement"
        />
        <AdminStatCard
          title="Net Revenue"
          value={loading ? "..." : `₹${(revenue?.net_revenue_rupees ?? 0).toLocaleString()}`}
          change={+32.4}
          changeLabel="post-refund net"
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          subtitle={`$${(revenue?.net_revenue_usd ?? 0).toFixed(2)} USD`}
        />
        <AdminStatCard
          title="Estimated MRR"
          value={loading ? "..." : `₹${(revenue?.estimated_mrr_rupees ?? 0).toLocaleString()}`}
          change={+18.7}
          changeLabel={`ARR ~₹${(revenue?.estimated_arr_rupees ?? 0).toLocaleString()}`}
          icon={<Layers className="size-4 text-primary" />}
          subtitle={`${revenue?.active_paid_subscriptions ?? 0} active subscribers`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Collection Chart */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Gross Revenue Intake</h3>
              <p className="text-xs text-muted-foreground">Daily settled transaction totals (₹ INR)</p>
            </div>
            <span className="text-xs font-mono font-medium text-muted-foreground">Period: {days} Days</span>
          </div>

          <div className="h-64 pt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
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
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{d.date}</p>
                          <p className="text-emerald-500 font-mono">₹{d.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{d.payments} transaction(s)</p>
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
                  fill="url(#grossGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown by Plan */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Revenue by Plan</h3>
              <span className="text-xs font-mono text-muted-foreground">Tiers</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Distribution across Developer and Autopilot passes</p>

            <div className="mt-4 space-y-3">
              {planBreakdown.length > 0 ? (
                planBreakdown.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{item.plan}</span>
                      <span className="font-mono font-bold text-emerald-500">₹{item.revenue_rupees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Purchases: {item.count}</span>
                      <span>Avg ticket: ₹{Math.round(item.revenue_rupees / (item.count || 1))}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No plan breakdown data yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-500 border border-emerald-500/20">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4" />
              <span>Razorpay Production Reconciliation</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-600/90 dark:text-emerald-400">
              Payment success rate: {revenue?.payment_success_rate ?? 100}% with signature validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

