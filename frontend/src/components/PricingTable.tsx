"use client";

import React, { useState, useEffect } from "react";
import { Check, Zap, Sparkles, Tag, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  paymentsApi,
  SubscriptionSummary,
  parseErrorMessage,
  PLAN_FREE,
  PLAN_CORE_PASS,
  PLAN_AUTOPILOT_PASS,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface PricingTableProps {
  currentSub?: SubscriptionSummary | null;
  onSuccess?: () => void;
  initialCoupon?: string;
}

export function PricingTable({ currentSub, onSuccess, initialCoupon }: PricingTableProps) {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState(initialCoupon || "");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (initialCoupon) {
      setCouponCode(initialCoupon);
    }
  }, [initialCoupon]);

  // Load Razorpay SDK dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleCheckout = async (planId: string) => {
    if (!user) {
      toast.info("Please sign in or create an account to upgrade.");
      window.location.href = "/login";
      return;
    }

    try {
      setLoadingPlan(planId);
      const planName = planId === PLAN_CORE_PASS ? "Core Pass" : "AutoPilot Pass";

      // 1. Create server-side Razorpay order
      const order = await paymentsApi.createOrder(planId, couponCode.trim() || undefined);

      if (!(window as any).Razorpay) {
        throw new Error("Razorpay payment gateway is still loading. Please retry in a moment.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "CodeMate AI",
        description: `Upgrade to ${planName}`,
        order_id: order.order_id,
        prefill: {
          name: user.display_name,
          email: user.email,
        },
        theme: {
          color: "#6366f1",
        },
        handler: async function (response: any) {
          try {
            await paymentsApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            });
            toast.success(`Payment verified! ${planName} is now active.`);
            if (onSuccess) onSuccess();
          } catch (verifyErr) {
            toast.error(parseErrorMessage(verifyErr, "Payment verification failed. Please contact support."));
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to initiate payment."));
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentSub || (currentSub.status || "").toUpperCase() !== "ACTIVE") return false;
    const curId = (currentSub.plan_id || "").toUpperCase();
    if (planId === PLAN_CORE_PASS) {
      return curId === "PLAN_CORE_PASS";
    }
    if (planId === PLAN_AUTOPILOT_PASS) {
      return curId === "PLAN_AUTOPILOT_PASS";
    }
    if (planId === PLAN_FREE) {
      return curId === "FREE";
    }
    return curId === planId.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Coupon input */}
      <div className="max-w-md mx-auto p-3 rounded-xl bg-zinc-900/60 border border-white/[0.08] flex items-center gap-2">
        <Tag className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Have a promo or coupon code?"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="bg-transparent border-none text-xs text-white placeholder-zinc-500 focus:outline-none w-full font-mono uppercase"
        />
        {couponCode && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
            Code Applied
          </span>
        )}
      </div>

      {/* 3 Tier Grid: Free + Exactly 2 Paid Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Free Plan */}
        <Card className="bg-zinc-950/70 border-white/[0.08] flex flex-col justify-between relative overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  Community
                </span>
                {(!currentSub || (currentSub.plan_id || "").toUpperCase() === "FREE") && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                    Current Plan
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Free Tier</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Essential algorithmic assistance for exploratory developers.
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">₹0</span>
                <span className="text-xs text-zinc-500">/ forever</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>5 requests / day AI quota</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Smart Clipboard with 1-Click Replace All</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>1 registered extension device</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Problem comprehension & C++/Java/Python solvers</span>
                </li>
              </ul>
            </div>

            <button
              disabled
              className="w-full py-2.5 rounded-lg bg-white/[0.05] text-zinc-400 text-xs font-semibold cursor-not-allowed border border-white/[0.06]"
            >
              Default Active
            </button>
          </CardContent>
        </Card>

        {/* Paid Plan 1: PLAN_CORE_PASS (₹21 / day) */}
        <Card className="bg-gradient-to-b from-indigo-950/40 via-zinc-950/90 to-zinc-950 border-indigo-500/30 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-indigo-500/10">
          <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider rounded-bl-lg">
            Popular Day Pass
          </div>
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-medium text-indigo-400 uppercase tracking-wider">
                  Sprint Pass
                </span>
                {isCurrentPlan(PLAN_CORE_PASS) && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Core Pass
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                24-hour sprint pass for coding tests, contest rounds, and interview sprints.
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">₹21</span>
                <span className="text-xs text-zinc-400">/ 24 hours</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-medium text-white">25 requests / day high-speed AI</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>1 registered extension device</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Code refactoring & error diagnostics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Fast AI queue priority</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(PLAN_CORE_PASS)}
              disabled={loadingPlan === PLAN_CORE_PASS}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === PLAN_CORE_PASS ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing Order...</span>
                </>
              ) : (
                <>
                  <span>Get Core Pass for ₹21</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Paid Plan 2: PLAN_AUTOPILOT_PASS (₹61 / week) */}
        <Card className="bg-gradient-to-b from-purple-950/40 via-zinc-950/90 to-zinc-950 border-purple-500/30 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-purple-500/10">
          <div className="absolute top-0 right-0 px-3 py-1 bg-purple-600 text-[10px] font-bold text-white uppercase tracking-wider rounded-bl-lg">
            Best Value
          </div>
          <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-medium text-purple-400 uppercase tracking-wider">
                  Weekly Pass
                </span>
                {isCurrentPlan(PLAN_AUTOPILOT_PASS) && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                AutoPilot Pass
                <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400" />
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                7-day complete autonomous coding across all your browser workstations.
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">₹61</span>
                <span className="text-xs text-zinc-400">/ 7 days</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-medium text-white">100 req/day (Unlimited with BYOK)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-semibold text-white">2 registered extension devices</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>1-Click Autonomous In-Editor Injection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>EPC-PFS Multi-File Project Synthesis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>BYOK Personal Keys (OpenAI, Claude, Gemini)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(PLAN_AUTOPILOT_PASS)}
              disabled={loadingPlan === PLAN_AUTOPILOT_PASS}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              {loadingPlan === PLAN_AUTOPILOT_PASS ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing Order...</span>
                </>
              ) : (
                <>
                  <span>Get AutoPilot Pass for ₹61</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-zinc-500 text-[11px] flex items-center justify-center gap-2 pt-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>End-to-end encrypted 256-bit checkout powered by Razorpay. Zero automated card renewals.</span>
      </div>
    </div>
  );
}
