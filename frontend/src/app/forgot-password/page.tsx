"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authApi, parseErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
      toast.success("Password reset instructions dispatched.");
    } catch (err) {
      const msg = parseErrorMessage(err, "Failed to send reset link.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
          className="text-xs text-zinc-400 hover:text-white transition font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Reset Your Password
            </h2>
            <p className="text-xs text-zinc-400">
              Enter your account email and we&apos;ll send you a single-use recovery link.
            </p>
          </div>

          <Card className="bg-zinc-950/80 border-white/[0.08] shadow-2xl shadow-indigo-950/20">
            <CardContent className="p-6 space-y-5">
              {submitted ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Check Your Email</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    If an active account exists for <span className="font-mono text-zinc-200">{email}</span>, you will receive password reset instructions.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-white/[0.08] transition"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="text-zinc-300 font-medium block mb-1">Account Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/[0.1] rounded-lg pl-9 pr-3.5 py-2.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
                        />
                        <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email}
                      className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
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
      </div>

      <footer className="h-12 border-t border-white/[0.08] px-6 flex items-center justify-between text-[11px] text-zinc-500">
        <span>CodeMate Platform</span>
        <span className="font-mono">Secure Token Dispatch</span>
      </footer>
    </div>
  );
}

