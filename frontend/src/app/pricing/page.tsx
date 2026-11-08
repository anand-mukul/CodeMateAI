"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { PricingTable } from "@/components/PricingTable";
import { useAuth } from "@/lib/auth-context";

export default function PricingPage() {
  const { user, refreshUser } = useAuth();
  const [initialCoupon, setInitialCoupon] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const coupon = params.get("coupon") || params.get("coupon_code");

      if (coupon) {
        setInitialCoupon(coupon.toUpperCase());
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <header className="h-16 border-b border-white/[0.08] px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">CodeMate</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            PRICING
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-white/[0.08] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          {user ? (
            <Link
              href="/dashboard?tab=overview"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
            >
              <span>{user.display_name || "My Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Pricing Hero & Grid */}
      <main className="flex-1 py-12 px-6 lg:px-12 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            <Zap className="w-3.5 h-3.5" />
            <span>Transparent Developer Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Choose Your High-Performance Access Pass
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            From daily contest sprints to autonomous weekly multi-file solving with 1-click editor injection.
          </p>
        </div>

        <PricingTable initialCoupon={initialCoupon} />

        {/* Security & Guarantee Trust Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.08] max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Instant Activation via Secure Razorpay Checkout</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Payments are verified directly via Razorpay webhook. Entitlements sync across your browser extension and web portal in real-time. Cancel or switch passes anytime.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.08] py-6 px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">CodeMate</span>
          <span>•</span>
          <span>Autonomous Competitive Programming & Web IDE Platform</span>
        </div>
        <div className="font-mono text-[11px] text-zinc-600">
          © {new Date().getFullYear()} CodeMate. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

