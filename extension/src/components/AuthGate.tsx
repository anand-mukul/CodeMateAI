import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Code2,
  ExternalLink,
  ClipboardPaste,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/auth-service';

interface AuthGateProps {
  onNotify?: (message: string, isError?: boolean) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onNotify }) => {
  const { login, register, loginWithToken } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup' | 'token'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sessionTokenInput, setSessionTokenInput] = useState('');
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
        onNotify?.('Signed in successfully', false);
      } else if (tab === 'signup') {
        await register(email, password, displayName);
        onNotify?.('Account created and signed in', false);
      } else if (tab === 'token') {
        await handleTokenLogin();
      }
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Authentication failed. Please check credentials.';
      setLocalError(msg);
      onNotify?.(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenLogin = async () => {
    const clean = sessionTokenInput.trim();
    if (!clean) {
      setLocalError('Please paste your session token from the web portal.');
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await loginWithToken(clean);
      onNotify?.('Linked session successfully', false);
    } catch (err: any) {
      const msg = err.data?.detail || err.message || 'Invalid or expired session token.';
      setLocalError(msg);
      onNotify?.(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 10) {
        setSessionTokenInput(text.trim());
      }
    } catch {
      // ignore
    }
  };

  const handleOpenWebDashboard = async () => {
    const webUrl = AuthService.getWebPortalUrl();
    const token = AuthService.getCachedAccessToken();
    let dest = `${webUrl}/login`;
    if (token) {
      dest = `${webUrl}/dashboard`;
      try {
        const code = await AuthService.createHandoffCode();
        dest = `${webUrl}/dashboard?handoff_code=${encodeURIComponent(code)}`;
      } catch {
        // Fall back
      }
    }
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: dest });
    } else {
      window.open(dest, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2 text-slate-100">
      {/* Quiet Header */}
      <div className="flex flex-col items-center text-center gap-1.5 pt-2 pb-1">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Sign in to CodeMate</h2>
          <p className="text-[11px] text-slate-400">Continue with your account to solve problems</p>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => {
            setTab('signin');
            setLocalError(null);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
            tab === 'signin'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('signup');
            setLocalError(null);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
            tab === 'signup'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('token');
            setLocalError(null);
          }}
          className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
            tab === 'token'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Web token
        </button>
      </div>

      {/* Error Alert */}
      {localError && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-tight">
          {localError}
        </div>
      )}

      {/* Form Area */}
      {tab === 'token' ? (
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] text-slate-400 leading-normal">
            If you are already logged in to the web portal, copy your session token from your account page to link this extension.
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-300">Session token</label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <ClipboardPaste className="w-3 h-3" />
                <span>Paste clipboard</span>
              </button>
            </div>
            <textarea
              rows={3}
              required
              placeholder="Paste session token..."
              value={sessionTokenInput}
              onChange={(e) => setSessionTokenInput(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="button"
            disabled={loading || !sessionTokenInput.trim()}
            onClick={handleTokenLogin}
            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Linking...' : 'Link session'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {tab === 'signup' && (
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">Name</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">Email</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Signing in...' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}

      {/* Subtle Link to Web Portal */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Need to manage account?</span>
        <button
          type="button"
          onClick={handleOpenWebDashboard}
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
        >
          <span>Open web dashboard</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default AuthGate;
