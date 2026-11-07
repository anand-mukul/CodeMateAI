/**
 * CodeMate AI — Mandatory Email Verification Gate (EmailVerificationGate.tsx)
 * Enforces email verification before granting access to code generation & AutoPilot.
 */

import React, { useState } from 'react';
import { Mail, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, LogOut } from 'lucide-react';
import { UserProfile } from '../types/auth';
import { AuthService } from '../services/auth-service';

interface EmailVerificationGateProps {
  user: UserProfile;
  onVerified: () => Promise<void>;
  onNotify?: (message: string, isError?: boolean) => void;
  onLogout: () => Promise<void>;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({
  user,
  onVerified,
  onNotify,
  onLogout,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter your verification token.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await AuthService.verifyEmail(tokenInput.trim());
      setSuccessMessage('✓ Email verified successfully! Unlocking workspace...');
      onNotify?.('✓ Account verified successfully!', false);
      await onVerified();
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Invalid or expired verification token.';
      setErrorMessage(msg);
      onNotify?.(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMessage(null);
    try {
      await AuthService.resendVerification(user.email);
      setSuccessMessage('✓ New verification token dispatched to your email.');
      onNotify?.('Verification email resent. Check your inbox.', false);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Failed to resend token.';
      setErrorMessage(msg);
      onNotify?.(msg, true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in text-slate-100 font-sans">
      {/* Brand Verification Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-md shadow-amber-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Email Verification Required
            </h2>
            <p className="text-[11px] text-slate-400">Security & Account Activation</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mt-2">
          Your account (<strong className="text-white">{user.email}</strong>) must be verified before using CodeMate AI code generation, AutoPilot, and multi-file intelligence.
        </p>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mt-3 p-2.5 bg-red-950/50 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-start gap-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Token Verification Form */}
        <form onSubmit={handleVerify} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Verification Token
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste verification token from email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{loading ? 'Verifying...' : 'Verify & Activate Account'}</span>
          </button>
        </form>

        {/* Actions & Resend */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-amber-400 hover:text-amber-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            <span>Resend verification email</span>
          </button>

          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
