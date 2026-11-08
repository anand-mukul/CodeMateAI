"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authApi, parseErrorMessage } from "@/lib/api";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Reset token is missing from the URL. Please re-check your email link.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast.success("Password reset successfully! Please sign in.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      const msg = parseErrorMessage(err, "Failed to reset password. Link may have expired.");
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
          Set New Password
        </h2>
        <p className="text-xs text-zinc-400">
          Enter a secure password for your CodeMate developer account.
        </p>
      </div>

      <Card className="bg-zinc-950/80 border-white/[0.08] shadow-2xl shadow-indigo-950/20">
        <CardContent className="p-6 space-y-5">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Password Updated</h3>
              <p className="text-xs text-zinc-400">
                Redirecting you to the sign-in page...
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Sign In Now
                </Link>
              </div>
            </div>
          ) : (
            <>
              {!token && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    No reset token detected. Please make sure you followed the full link from your recovery email.
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-300 font-medium block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-medium block mb-1">Confirm New Password</label>
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
                  disabled={loading || !token || !password || !confirmPassword}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
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
          href="/login"
          className="text-xs text-zinc-400 hover:text-white transition font-medium"
        >
          Sign In
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="size-6 animate-spin text-indigo-500" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <footer className="h-12 border-t border-white/[0.08] px-6 flex items-center justify-between text-[11px] text-zinc-500">
        <span>CodeMate Platform</span>
        <span className="font-mono">Single-Use Token Cryptography</span>
      </footer>
    </div>
  );
}

