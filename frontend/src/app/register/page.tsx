"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { parseErrorMessage } from "@/lib/api";
import { toast } from "sonner";

function RegisterForm() {
  const router = useRouter();
  const { register, token, isLoading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && token) {
      router.push("/dashboard");
    }
  }, [isLoading, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Password and confirmation password do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(email.trim(), password, displayName.trim() || "Developer");
      toast.success("Account created successfully! Welcome to CodeMate.");
      router.push("/dashboard");
    } catch (err) {
      const msg = parseErrorMessage(err);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Create Developer Account
        </h2>
        <p className="text-xs text-zinc-400">
          Get started with 500 daily requests, Monaco editor integration, and extension sync.
        </p>
      </div>

      <Card className="bg-zinc-950/80 border-white/[0.08] shadow-2xl shadow-indigo-950/20">
        <CardContent className="p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-lg border border-white/[0.06] text-xs">
            <Link
              href="/login"
              className="py-1.5 rounded-md font-medium text-center text-zinc-400 hover:text-white transition"
            >
              Sign In
            </Link>
            <span className="py-1.5 rounded-md font-medium text-center bg-indigo-600 text-white shadow-sm">
              Create Account
            </span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-300 font-medium block mb-1">Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Chen"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3.5 py-2.5 pr-10 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-zinc-300 font-medium block mb-1">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center space-y-2 text-xs">
        <p className="text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
        <p className="text-[11px] text-zinc-600">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-zinc-100 selection:bg-indigo-500/30">
      <nav className="h-16 px-6 sm:px-12 border-b border-white/[0.08] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">CodeMate</span>
        </Link>

        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-white transition font-medium"
        >
          Back to Overview
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="size-6 animate-spin text-indigo-500" />}>
          <RegisterForm />
        </Suspense>
      </div>

      <footer className="h-12 border-t border-white/[0.08] px-6 flex items-center justify-between text-[11px] text-zinc-500">
        <span>CodeMate Platform</span>
        <span className="font-mono">Individual Developer License</span>
      </footer>
    </div>
  );
}

