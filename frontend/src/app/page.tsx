"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Code2,
  FileCode2,
  ShieldCheck,
  Check,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";
import { PricingTable } from "@/components/PricingTable";
import { useAuth } from "@/lib/auth-context";

export default function LandingPage() {
  const { user } = useAuth();
  const apiDocsUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/docs`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <header className="h-16 border-b border-white/[0.08] px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">CodeMate</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            PLATFORM
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs text-zinc-400 font-medium">
          <a href="#features" className="hover:text-white transition">Capabilities</a>
          <a href="#architecture" className="hover:text-white transition">Architecture</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a
            href={apiDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            API Reference
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs text-zinc-400 hover:text-white transition font-medium px-2 py-1"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-indigo-600/30"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 lg:px-12 flex flex-col items-center text-center max-w-5xl mx-auto overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-medium mb-8 hover:border-white/[0.16] transition cursor-default">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>CodeMate v2.4 Engine Live</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.12]">
          Autonomous AI for Competitive Programming &amp; Web IDEs
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Real-time problem comprehension, indentation-safe Monaco injection, topological multi-file synthesis, and sub-second execution on LeetCode, CodeChef, and beyond.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-indigo-600/25"
          >
            <span>Open Developer Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 text-sm font-medium border border-white/[0.08] transition flex items-center justify-center"
          >
            View Pricing Plans
          </a>
        </div>

        {/* Editor Showcase Preview */}
        <div className="mt-16 w-full max-w-4xl rounded-2xl border border-white/[0.1] bg-black/60 shadow-2xl shadow-indigo-950/40 overflow-hidden text-left font-mono text-xs">
          {/* Editor Header Bar */}
          <div className="h-10 px-4 bg-zinc-900/80 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-3 text-zinc-400 text-[11px]">CodeChef • Practice • Solution.java</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-Pilot Active</span>
            </div>
          </div>

          {/* Code Window */}
          <div className="p-6 space-y-2 text-zinc-300 overflow-x-auto leading-relaxed">
            <p className="text-zinc-500">{"// CodeMate Sequential Multi-File & Competitive Solver"}</p>
            <p className="text-purple-400">
              import <span className="text-zinc-300">java.io.*;</span>
            </p>
            <p className="text-purple-400">
              import <span className="text-zinc-300">java.util.*;</span>
            </p>
            <p className="text-indigo-400 pt-2">
              public class <span className="text-amber-300">Main</span> &#123;
            </p>
            <p className="pl-4 text-zinc-400">
              <span className="text-purple-400">public static void</span>{" "}
              <span className="text-blue-400">main</span>(String[] args) throws IOException &#123;
            </p>
            <p className="pl-8 text-zinc-400">
              BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            </p>
            <p className="pl-8 text-emerald-400">
              {"// Topological resolution: O(N log N) optimal segment tree traversal"}
            </p>
            <p className="pl-8 text-zinc-300">
              FastScanner sc = new FastScanner(br);
            </p>
            <p className="pl-8 text-zinc-300">
              solve(sc);
            </p>
            <p className="pl-4 text-zinc-400">&#125;</p>
            <p className="text-indigo-400">&#125;</p>
          </div>

          {/* Test Status Footer */}
          <div className="h-10 px-4 bg-zinc-900/60 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Build Success: 18/18 Unit Tests Passed (0.04s)</span>
            </div>
            <span className="font-semibold text-white">Status: Accepted (100 pts)</span>
          </div>
        </div>
      </section>

      {/* Engineering Capabilities Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 border-t border-white/[0.08] max-w-6xl mx-auto w-full">
        <div className="text-center space-y-2 mb-14">
          <span className="text-xs font-mono font-medium text-indigo-400 uppercase tracking-wider">
            Capabilities
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Built for Engineering Excellence
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Transform competitive coding from tedious boilerplate into intelligent execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">1-Click Auto-Pilot</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Analyzes problem requirements, completes missing components, executes compilation, and verifies against test cases automatically.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Smart Clipboard</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Native editor buffer synchronization. Automatically extracts code, fixes indentation staircase issues, and supports zero-friction paste.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">EPC-PFS Architecture</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Topological sequential solving for Spring Boot, React, and polyglot multi-file structures. Preserves interfaces and prevents file corruption.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Privacy &amp; BYOK</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zero storage of complete source code or user prompts. Flexible BYOK model support across Google Gemini, Claude, and OpenAI.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 lg:px-12 border-t border-white/[0.08] bg-zinc-950/60">
        <div className="text-center space-y-2 mb-14">
          <span className="text-xs font-mono font-medium text-indigo-400 uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Transparent, High-Speed Pricing
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Choose a pass designed for intense coding rounds or persistent daily workflow.
          </p>
        </div>

        <PricingTable />
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.08] py-8 px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">CodeMate</span>
          <span>•</span>
          <span>Silicon Valley Developer Platform</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href={apiDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-300 transition"
          >
            API Reference
          </a>
          <Link href="/login" className="hover:text-zinc-300 transition">
            Sign In
          </Link>
          <a href="#pricing" className="hover:text-zinc-300 transition">
            Pricing
          </a>
        </div>

        <div className="font-mono text-[11px] text-zinc-600">
          © {new Date().getFullYear()} CodeMate. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
