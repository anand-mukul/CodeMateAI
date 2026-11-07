/**
 * CodeMate AI — Authentication Modal (Login, Register, Recovery, Verification)
 */

import React, { useState } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth-service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onNotify?: (message: string, isError?: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  onNotify,
}) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onNotify?.('Successfully logged in!', false);
        onClose();
      } else if (mode === 'register') {
        await register(email, password, displayName);
        onNotify?.('Account registered and logged in! Verification token sent.', false);
        onClose();
      } else if (mode === 'forgot') {
        const res = await AuthService.forgotPassword(email);
        onNotify?.(res.message, false);
        setMode('login');
      } else if (mode === 'verify') {
        const res = await AuthService.verifyEmail(tokenInput);
        onNotify?.(res.message, false);
        onClose();
      }
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Operation failed';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {mode === 'login' && 'Sign in to CodeMate AI'}
                {mode === 'register' && 'Create Developer Account'}
                {mode === 'forgot' && 'Reset Password'}
                {mode === 'verify' && 'Verify Email Address'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'login' && 'Manage devices, subscriptions, and AI quotas'}
                {mode === 'register' && 'Unlock AI explanations and quota management'}
                {mode === 'forgot' && 'Enter your email for single-use recovery token'}
                {mode === 'verify' && 'Enter your single-use verification token'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {localError && (
          <div className="mx-4 mt-3 p-2.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Display Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      setMode('forgot');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars, 1 uppercase, 1 digit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'verify' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Verification Token</label>
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste verification token here"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Register Account'}
                  {mode === 'forgot' && 'Send Recovery Email'}
                  {mode === 'verify' && 'Verify Email'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer switchers */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'login' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setMode('register');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign up
              </button>
            </span>
          )}
          {mode === 'register' && (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setMode('login');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign in
              </button>
            </span>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                setMode('login');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

