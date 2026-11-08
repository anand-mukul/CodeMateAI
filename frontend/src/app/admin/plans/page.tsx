"use client";

import * as React from "react";
import {
  Layers,
  Check,
  Zap,
  Shield,
  Smartphone,
  Cpu,
  Sparkles,
  Lock,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlanConfig {
  id: string;
  name: string;
  priceInr: number;
  priceUsd: number;
  interval: string;
  dailySolveLimit: number;
  deviceLimit: number;
  concurrentSessions: number;
  features: string[];
  recommended?: boolean;
}

const PLANS: PlanConfig[] = [
  {
    id: "FREE",
    name: "Student Free Tier",
    priceInr: 0,
    priceUsd: 0,
    interval: "month",
    dailySolveLimit: 5,
    deviceLimit: 1,
    concurrentSessions: 1,
    features: [
      "5 AI code solutions / day",
      "Standard latency queue",
      "1 Chrome extension device",
      "Community support",
      "Single-file problem solving",
    ],
  },
  {
    id: "PLAN_CORE_PASS",
    name: "Core Developer Pass",
    priceInr: 299,
    priceUsd: 3.49,
    interval: "month",
    dailySolveLimit: 50,
    deviceLimit: 2,
    concurrentSessions: 2,
    recommended: true,
    features: [
      "50 high-speed AI code solutions / day",
      "DeepSeek Flash & Gemini 3.8 Flash engines",
      "Subprocess compiler verification",
      "2 registered devices (Extension + Web)",
      "Standard email support",
      "Syntax tree AST analysis",
    ],
  },
  {
    id: "PLAN_AUTOPILOT_PASS",
    name: "Autopilot Pro Pass",
    priceInr: 799,
    priceUsd: 9.19,
    interval: "month",
    dailySolveLimit: 250,
    deviceLimit: 5,
    concurrentSessions: 3,
    features: [
      "250 solutions / day + R1 reasoning tokens",
      "DeepSeek V4 Pro & Gemini 4 Argon access",
      "Multi-file dependency graph resolver",
      "Automated test suite generation",
      "5 registered developer devices",
      "Zero rate limits on priority queue",
      "Priority administrative support",
    ],
  },
];

export default function AdminPlansPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscription Plans & Quotas"
        description="Official SaaS pricing tiers, device limits, and server-side feature entitlement matrices."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Plans" }]}
        badge="3 Active Tiers"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl border bg-card p-6 flex flex-col justify-between shadow-2xs relative ${
              plan.recommended ? "border-primary shadow-sm" : "border-border"
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-2.5 right-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Most Popular
              </span>
            )}

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {plan.id}
                </Badge>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-mono text-foreground">
                  ₹{plan.priceInr}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  / {plan.interval} (${plan.priceUsd} USD)
                </span>
              </div>

              {/* Resource Quota Grid */}
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-2.5 text-center text-xs border border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Daily Solves</span>
                  <span className="font-mono font-bold text-foreground">{plan.dailySolveLimit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Devices</span>
                  <span className="font-mono font-bold text-foreground">{plan.deviceLimit}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Sessions</span>
                  <span className="font-mono font-bold text-foreground">{plan.concurrentSessions}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="mt-5 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Entitlements
                </span>
                <ul className="space-y-2 text-xs text-muted-foreground pt-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Billing Engine</span>
              <span className="font-semibold text-foreground">Razorpay Subscriptions</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

