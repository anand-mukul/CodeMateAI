"use client";

import React, { useState } from "react";
import { Copy, Check, KeyRound, ShieldAlert, Zap, ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { getApiBaseUrl } from "@/lib/api";
import { toast } from "sonner";

export function ExtensionSyncCard() {
  const { token, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success("Session token copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-zinc-950/80 border-white/[0.08] overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Extension Cloud Sync
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Live
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Authenticate your Chrome Extension with this web session instantly without typing passwords.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08]">
              Backend: {getApiBaseUrl().replace('https://', '')}
            </span>
          </div>
        </div>

        {/* Token Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">
              Active Session Token
            </label>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              {showToken ? "Mask token" : "Reveal full token"}
            </button>
          </div>

          <div className="relative flex items-center">
            <div className="w-full bg-black/60 border border-white/[0.1] rounded-lg px-3.5 py-2.5 font-mono text-xs text-zinc-300 overflow-x-auto select-all scrollbar-none">
              {token ? (showToken ? token : `${token.slice(0, 32)}••••••••••••••••••••••••••••••••••••••••${token.slice(-16)}`) : "No active session"}
            </div>
            <button
              onClick={handleCopy}
              disabled={!token}
              className="absolute right-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Quick Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">1</span>
              <span>Open Sidepanel</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Click the CodeMate icon in your browser toolbar to open the AI sidepanel.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">2</span>
              <span>Sign In with Token</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If not auto-detected, click &quot;Direct Token Login&quot; or paste credentials. No backend URL needed!
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">3</span>
              <span>Autonomous Execution</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Solve problems on LeetCode/CodeChef with 1-click auto-pilot &amp; instant editor injection.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

