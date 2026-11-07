'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Code2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Key,
  ExternalLink,
  Lock,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';
import { fetchWithAuth, parseErrorMessage } from '../lib/api';

export default function LandingPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    const endpoint = tab === 'signup' ? '/api/auth/register' : '/api/auth/login';
    const payload = tab === 'signup'
      ? { email: email.trim(), password, display_name: name.trim() || undefined }
      : { email: email.trim(), password, device_id: 'web_portal', device_name: 'Web Dashboard', browser_name: 'Web Portal' };

    try {
      const data = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const token = data.access_token || data.tokens?.access_token;
      if (token) {
        localStorage.setItem('codemate_web_token', token);
        window.location.href = '/portal';
      } else if (tab === 'signup') {
        setAlert({ msg: '✓ Account created successfully! Please sign in.', isError: false });
        setTab('signin');
      }
    } catch (err: any) {
      setAlert({ msg: err.message || 'Authentication failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-[#07090e] text-slate-100">
      {/* Ambient Lighting */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[600px] -right-20 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/80 border-b border-white/[0.08] px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white text-base tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span>CodeMate</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/pricing" className="hover:text-white transition-colors">Passes</a>
          <a href="https://codemate-backend-wsi1.onrender.com/docs" target="_blank" className="hover:text-white transition-colors">Documentation</a>
        </nav>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <button
            onClick={() => {
              setTab('signin');
              document.getElementById('authCard')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('signup');
              document.getElementById('authCard')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-1.5 rounded-lg btn-gradient font-medium shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 flex-1 w-full flex flex-col gap-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Product Value */}
          <div className="lg:col-span-7 flex flex-col items-start gap-4 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Intelligent Browser Workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Write better code.<br />
              <span className="text-gradient">Solve harder problems.</span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              CodeMate connects seamlessly with your browser editors and practice environments to analyze logic, generate robust multi-file architectures, and debug solutions in real time.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 gap-3.5 w-full max-w-lg mt-3">
              <div className="glass-panel p-4 rounded-xl flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Instant Algorithmic Comprehension</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Detects edge cases, handles constraints, and optimizes time & space complexity.</p>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Multi-File Architecture Synthesis</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Synthesizes Spring Boot services, React components, and polyglot projects cleanly.</p>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-xl flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Hardware-Bound Privacy</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Zero code retention. Cryptographically authorized sessions link directly to your extension.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Card */}
          <div id="authCard" className="lg:col-span-5 glass-panel p-7 rounded-2xl shadow-2xl relative">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {tab === 'signin' ? 'Sign in to CodeMate' : 'Create your account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {tab === 'signin' ? 'Access your quotas, devices, and session keys' : 'Start solving with intelligent assistance for free'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/[0.08] text-xs mb-4">
              <button
                type="button"
                onClick={() => { setTab('signin'); setAlert(null); }}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
                  tab === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setAlert(null); }}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
                  tab === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Alert */}
            {alert && (
              <div className={`p-3 rounded-xl text-xs mb-3 flex items-start gap-2 ${
                alert.isError ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}>
                <span>{alert.msg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ada Lovelace"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="dev@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black/50 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-xl btn-gradient text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Processing...' : tab === 'signin' ? 'Sign In to CodeMate ➔' : 'Create Free Account ➔'}</span>
              </button>
            </form>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              By continuing, you agree to CodeMate's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="flex flex-col gap-10">
          <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-sm">
              Pay for practice days, not monthly commitments. Zero lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Free Tier</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-slate-400">Forever</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white">₹0</span>
                </div>
                <p className="text-xs text-slate-400">Essential code analysis and manual solution generation.</p>
                <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>5 requests / day</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>1 registered device</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>Manual copy-paste output</span></div>
                </div>
              </div>
              <button
                onClick={() => {
                  setTab('signup');
                  document.getElementById('authCard')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition"
              >
                Get Started Free
              </button>
            </div>

            {/* Core Pass */}
            <div className="glass-panel p-6 rounded-2xl border-2 border-emerald-500/50 flex flex-col justify-between gap-5 relative shadow-xl shadow-emerald-500/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Most Popular
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Core Pass</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">Day Pass</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white">₹21</span>
                  <span className="text-xs text-slate-400"> / day</span>
                </div>
                <p className="text-xs text-slate-400">Power pass for contest rounds, problem solving, and complex optimizations.</p>
                <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span><strong>25 requests / day</strong></span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>Optimal Code Generation & Fixer</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span>1 device • Single session</span></div>
                </div>
              </div>
              <a href="/pricing" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-center text-xs font-semibold transition shadow-md shadow-emerald-600/30">
                Get Core Pass ➔
              </a>
            </div>

            {/* AutoPilot Pass */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/40 flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">AutoPilot Pass</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30">Week Pass</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-white">₹61</span>
                  <span className="text-xs text-slate-400"> / week</span>
                </div>
                <p className="text-xs text-slate-400">Full autonomous coding companion with 1-click editor injection.</p>
                <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> <span><strong>100 requests / day</strong></span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> <span>1-click in-editor code injection</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> <span>Smart Practice Assistant & BYOK</span></div>
                </div>
              </div>
              <a href="/pricing" className="w-full py-2.5 rounded-xl btn-gradient text-white text-center text-xs font-semibold shadow-md shadow-indigo-600/30">
                Get AutoPilot Pass ➔
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#07090e]/80 backdrop-blur px-6 lg:px-12 py-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">CodeMate</span>
          <span>•</span>
          <span>The Intelligent Coding Workspace</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/pricing" className="hover:text-slate-300 transition">Pricing</a>
          <a href="https://codemate-backend-wsi1.onrender.com/docs" target="_blank" className="hover:text-slate-300 transition">API Reference</a>
          <span>© 2026 CodeMate Inc.</span>
        </div>
      </footer>
    </div>
  );
}
