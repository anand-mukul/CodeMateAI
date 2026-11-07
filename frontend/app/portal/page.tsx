'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Key,
  Laptop,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { fetchWithAuth, parseErrorMessage, getApiBaseUrl } from '../../lib/api';

export default function PortalDashboard() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDesc, setFeedbackDesc] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('codemate_web_token');
    if (!savedToken) {
      window.location.href = '/';
      return;
    }
    setToken(savedToken);
    loadDashboard(savedToken);
  }, []);

  const loadDashboard = async (authToken: string) => {
    setLoading(true);
    try {
      const profile = await fetchWithAuth('/api/auth/me');
      setUser(profile);

      try {
        const sub = await fetchWithAuth('/api/subscription/me');
        setSubscription(sub);
      } catch {}

      try {
        const devList = await fetchWithAuth('/api/auth/devices');
        setDevices(devList || []);
      } catch {}
    } catch {
      localStorage.removeItem('codemate_web_token');
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVerifySelf = async () => {
    try {
      const res = await fetchWithAuth('/api/auth/verify-self', { method: 'POST' });
      alert('✓ ' + (res.message || 'Email verified successfully!'));
      if (token) loadDashboard(token);
    } catch (err: any) {
      alert('Verification error: ' + err.message);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device?')) return;
    try {
      await fetchWithAuth(`/api/auth/devices/${deviceId}/revoke`, { method: 'POST' });
      alert('Device revoked successfully.');
      if (token) loadDashboard(token);
    } catch (err: any) {
      alert('Could not revoke device: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('codemate_web_token');
    window.location.href = '/';
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/feature-requests', {
        method: 'POST',
        body: JSON.stringify({ title: feedbackTitle, description: feedbackDesc, category: 'GENERAL' }),
      });
      alert('✓ Thank you! Your feedback has been registered.');
      setFeedbackTitle('');
      setFeedbackDesc('');
    } catch (err: any) {
      alert('Feedback submission error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const activeExtensionDevices = devices.filter(
    (d) => d.device_status === 'active' && !d.device_id.includes('web')
  );
  const allowedDeviceLimit = subscription?.device_limit || 1;
  const requestsToday = subscription?.ai_requests_today || 0;
  const requestsLimit = subscription?.ai_usage_limit || 5;
  const quotaPct = Math.min(100, Math.round((requestsToday / requestsLimit) * 100));

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/80 border-b border-white/[0.08] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white text-base tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span>CodeMate</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full flex flex-col gap-6">
        
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              {(user?.display_name || user?.email || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white">
                  {user?.display_name || user?.email?.split('@')[0]}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300">
                  {(user?.role || 'user').toUpperCase()}
                </span>
                {user?.email_verified ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ✓ Verified
                  </span>
                ) : (
                  <button
                    onClick={handleVerifySelf}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
                  >
                    ✉️ Unverified <span className="underline font-bold ml-1">[Verify Now]</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/pricing"
              className="px-4 py-2 rounded-xl btn-gradient text-xs font-semibold shadow-md shadow-indigo-600/30"
            >
              Upgrade Subscription ➔
            </a>
          </div>
        </div>

        {/* 4-Card Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Quota */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Daily AI Solves</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-white">{requestsToday} / {requestsLimit}</div>
              <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden mt-2">
                <div className="h-full btn-gradient rounded-full transition-all" style={{ width: `${quotaPct}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-slate-500">Resets daily at 00:00 UTC</span>
          </div>

          {/* Subscription Tier */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Current Plan</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="my-3">
              <div className="text-xl font-bold text-white">{subscription?.plan_name || 'Free Tier'}</div>
              <p className="text-xs text-slate-400 mt-0.5">{requestsLimit} req/day • {allowedDeviceLimit} device</p>
            </div>
            <a href="/pricing" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Manage Plan ➔
            </a>
          </div>

          {/* Connected Devices */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active Devices</span>
              <span className="text-xs font-mono text-indigo-400">
                {activeExtensionDevices.length} / {allowedDeviceLimit}
              </span>
            </div>
            <div className="my-3">
              <div className="text-sm font-semibold text-white">
                {activeExtensionDevices[0]?.device_name || 'No Extension Linked'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeExtensionDevices.length > 0 ? 'Primary Extension Active' : 'Paste session token below to link'}
              </p>
            </div>
            <span className="text-[10px] text-slate-500">Hardware Bound</span>
          </div>

          {/* API Health */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Backend Gateway</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            </div>
            <div className="my-3">
              <div className="text-sm font-semibold text-white">Cloud API Online</div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{getApiBaseUrl()}</p>
            </div>
            <a href="https://codemate-backend-wsi1.onrender.com/docs" target="_blank" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              API Documentation ➔
            </a>
          </div>
        </div>

        {/* Chrome Extension 1-Click Link Card */}
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Link CodeMate Chrome Extension</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy your session token below to connect your Chrome extension in one click without re-entering passwords:
              </p>
            </div>
            <button
              onClick={handleCopyToken}
              className="px-3.5 py-2 rounded-xl btn-gradient text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? '✓ Copied to Clipboard!' : 'Copy Session Token'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={token}
              onClick={handleCopyToken}
              className="w-full px-3 py-2 bg-black/60 border border-white/[0.08] rounded-xl font-mono text-xs text-indigo-300 selection:bg-indigo-600 select-all cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08] text-xs text-slate-400">
            <div>
              <strong className="text-white block mb-0.5">1. Copy Key</strong>
              Click the Copy button above to copy your session key.
            </div>
            <div>
              <strong className="text-white block mb-0.5">2. Open Extension</strong>
              Open the CodeMate sidepanel and select the <strong>[Paste Token]</strong> tab.
            </div>
            <div>
              <strong className="text-white block mb-0.5">3. Link Instantly</strong>
              Paste the key and click <strong>Link Extension</strong> to start coding.
            </div>
          </div>
        </div>

        {/* Devices List Table */}
        {activeExtensionDevices.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white">Registered Extension Devices</h3>
            <div className="space-y-2">
              {activeExtensionDevices.map((dev) => (
                <div key={dev.id} className="p-3 bg-black/40 border border-white/[0.06] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{dev.device_name || 'Chrome Extension'}</span>
                    <span className="text-slate-500 ml-2 font-mono">({dev.browser_name} • ID: {dev.device_id.slice(0, 8)}...)</span>
                  </div>
                  <button
                    onClick={() => handleRevokeDevice(dev.device_id)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold transition"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Request & Feedback */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white">💡 Submit Feature Request or Feedback</h3>
          <p className="text-xs text-slate-400">Have an idea or need support for a specific competitive coding platform?</p>
          <form onSubmit={handleFeedback} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Short title for your request..."
              value={feedbackTitle}
              onChange={(e) => setFeedbackTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              rows={3}
              required
              placeholder="Describe your use case..."
              value={feedbackDesc}
              onChange={(e) => setFeedbackDesc(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl btn-gradient text-xs font-semibold"
            >
              Submit Feedback
            </button>
          </form>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#07090e]/80 px-6 lg:px-12 py-5 text-xs text-slate-500 flex items-center justify-between">
        <span>CodeMate Workspace</span>
        <span>© 2026 CodeMate Inc.</span>
      </footer>
    </div>
  );
}
