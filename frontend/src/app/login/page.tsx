"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { parseErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, token, isLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && token) {
      router.push("/dashboard");
    }
  }, [isLoading, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome back! Signed in.");
      } else {
        await register(email, password, displayName || "Developer");
        toast.success("Account created successfully!");
      }
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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between text-zinc-100 selection:bg-indigo-500/30">
      {/* Top Navbar */}
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

      {/* Main Auth Form Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === "login" ? "Sign in to CodeMate" : "Create your account"}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "login"
                ? "Manage your extension access, devices, and AI quotas."
                : "Get started with 500 daily requests and browser sync."}
            </p>
          </div>

          <Card className="bg-zinc-950/80 border-white/[0.08] shadow-2xl shadow-indigo-950/20">
            <CardContent className="p-6 space-y-5">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-lg border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 rounded-md font-medium transition cursor-pointer ${
                    mode === "login"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 rounded-md font-medium transition cursor-pointer ${
                    mode === "register"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {mode === "register" && (
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
                )}

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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">Password</label>
                    {mode === "login" && (
                      <span className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer">
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                      <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === "login" ? "Sign In to Workspace" : "Create Account"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-zinc-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="h-12 border-t border-white/[0.08] px-6 flex items-center justify-between text-[11px] text-zinc-500">
        <span>CodeMate Platform</span>
        <span className="font-mono">Secure 256-bit Argon2id</span>
      </footer>
    </div>
  );
}

