/**
 * CodeMate AI — Mandatory Authentication Gate (AuthGate.tsx)
 * Blocks unauthenticated access to the extension and provides a streamlined,
 * high-conversion sign-in, registration, and web portal handshake experience.
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Code2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth-service';

interface AuthGateProps {
  onNotify?: (message: string, isError?: boolean) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onNotify }) => {
  const { login, register } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (tab === 'signin') {
        await login(email, password);
        onNotify?.('✓ Welcome back! Authentication successful.', false);
      } else if (tab === 'signup') {
        await register(email, password, displayName);
        onNotify?.('✓ Account created and signed in!', false);
      } else if (tab === 'forgot') {
        const res = await AuthService.forgotPassword(email);
        onNotify?.(res.message, false);
        setTab('signin');
      }
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Authentication failed. Please check credentials.';
      setLocalError(msg);
      onNotify?.(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWebDashboard = () => {
    const webUrl = 'http://127.0.0.1:8000/docs';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: webUrl });
    } else {
      window.open(webUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-fade-in text-slate-100">
      {/* Brand Hero Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/50 border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              CodeMate AI <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Sign In Required</span>
            </h2>
            <p className="text-[11px] text-slate-300">Intelligent Coding Companion & Autopilot</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mt-1">
          Sign in or create your developer account to access automated problem solving, progressive multi-file code completion, and cloud telemetry.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-indigo-500/20 text-[10px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>1-Click Auto Solve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Multi-File Spring & React</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero-Keystroke Paste</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Quota & Device Sync</span>
          </div>
        </div>
      </div>

      {/* Auth Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 text-center font-semibold rounded-lg transition-all ${
              tab === 'signin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 text-center font-semibold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Local Error Alert */}
        {localError && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
            <span className="text-red-400 font-bold">!</span>
            <span className="leading-tight">{localError}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {tab === 'signup' && (
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ada Lovelace"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="dev@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">Password</label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>
                  {tab === 'signin' && 'Sign In to Extension'}
                  {tab === 'signup' && 'Create Developer Account'}
                  {tab === 'forgot' && 'Send Recovery Token'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Web Portal Button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleOpenWebDashboard}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Manage via Web Dashboard</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Sign-in is required to secure device limits (max 2) and track AI request quotas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;

