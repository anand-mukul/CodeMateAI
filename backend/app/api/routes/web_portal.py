"""
CodeMate AI — Silicon Valley SaaS Web Portal & Dashboard (web_portal.py)
Provides a world-class landing page, enterprise authentication, and comprehensive SaaS dashboard
for account management, AI usage quotas, device sync, subscriptions, feature requests, and support.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Web Portal"])

WEB_PORTAL_HTML = """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeMate AI — Enterprise Developer Platform & Cloud Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              400: '#818cf8',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            },
            dark: {
              bg: '#080c15',
              card: '#0f172a',
              cardSub: '#0b1120',
              border: '#1e293b',
              borderSub: '#162032',
            }
          },
          fontFamily: {
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            mono: ['JetBrains Mono', 'Fira Code', 'monospace']
          }
        }
      }
    }
  </script>
  <style>
    @keyframes geminiGlow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.08); }
    }
    .animate-gemini-glow {
      animation: geminiGlow 8s ease-in-out infinite;
    }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: rgba(11, 17, 32, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .gradient-border-btn {
      position: relative;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      transition: all 0.2s ease;
    }
    .gradient-border-btn:hover {
      filter: brightness(1.1);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
  </style>
</head>
<body class="min-h-screen bg-[#080c15] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white flex flex-col justify-between relative overflow-x-hidden">

  <!-- Background Ambient Glows -->
  <div class="fixed inset-0 pointer-none z-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-blue-600/10 rounded-full blur-[120px] animate-gemini-glow"></div>
    <div class="absolute top-[600px] -right-40 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-10 -left-40 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
  </div>

  <!-- Enterprise Navbar -->
  <header class="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 lg:px-12 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3.5">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-base font-bold tracking-tight text-white">CodeMate AI</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">Cloud Platform</span>
        </div>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
      <a href="#features" class="hover:text-white transition-colors">Platform Capabilities</a>
      <a href="/docs" target="_blank" class="hover:text-white transition-colors">API Reference</a>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        API Operational
      </span>
    </nav>

    <!-- Auth Actions -->
    <div class="flex items-center gap-3" id="navAuthArea">
      <button onclick="scrollToAuth('signin')" class="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors">
        Sign In
      </button>
      <button onclick="scrollToAuth('signup')" class="text-xs font-semibold px-3.5 py-1.5 rounded-lg gradient-border-btn text-white shadow-sm">
        Get Started Free
      </button>
    </div>
  </header>

  <!-- MAIN VIEWPORT CONTAINER -->
  <main class="relative z-10 flex-1 flex flex-col items-center">

    <!-- ========================================== -->
    <!-- VIEW 1: LANDING & HERO (LOGGED OUT STATE)   -->
    <!-- ========================================== -->
    <div id="landingView" class="w-full max-w-7xl px-6 lg:px-12 py-12 flex flex-col items-center gap-16">
      
      <!-- Hero Header -->
      <div class="text-center max-w-3xl flex flex-col items-center gap-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium backdrop-blur-sm shadow-sm">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
          <span>Next-Generation Competitive Coding & Multi-File Auto-Pilot</span>
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
          Autonomous AI for <span class="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Competitive Programming</span> & Web IDEs
        </h1>
        <p class="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Real-time problem comprehension, indentation-safe Monaco & Ace editor injection, sequential multi-file project synthesis, and 1-click test execution on CodeChef & beyond.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button onclick="scrollToAuth('signup')" class="px-5 py-2.5 rounded-xl gradient-border-btn text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30">
            <span>Create Developer Account</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
          <button onclick="scrollToAuth('signin')" class="px-4 py-2.5 rounded-xl glass-panel text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all">
            Access Cloud Dashboard
          </button>
        </div>
      </div>

      <!-- Live Interactive Showcase & Auth Split -->
      <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left: Interactive Product Showcase Mockup (7 Cols) -->
        <div class="lg:col-span-7 glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl overflow-hidden flex flex-col gap-4">
          <!-- Window Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span class="text-[11px] font-mono text-slate-400 ml-2">CodeChef Practice • StudentService.java</span>
            </div>
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto-Pilot Active
            </div>
          </div>

          <!-- Code Preview Mock -->
          <div class="bg-[#0b0f19] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto border border-slate-800/60">
            <div class="text-slate-500">// ⚡ CodeMate AI Sequential Multi-File Intelligence (Spring Boot)</div>
            <div class="text-purple-400 mt-1">@Service</div>
            <div><span class="text-blue-400">public class</span> <span class="text-amber-300">StudentService</span> {</div>
            <div class="pl-4 text-slate-400">// Constructor Injection & Stream Lookup</div>
            <div class="pl-4"><span class="text-blue-400">public</span> Optional&lt;Student&gt; <span class="text-indigo-400">getByName</span>(String name) {</div>
            <div class="pl-8 text-emerald-400">return students.stream()</div>
            <div class="pl-12 text-emerald-400">.filter(s -&gt; s.getName().equalsIgnoreCase(name))</div>
            <div class="pl-12 text-emerald-400">.findFirst();</div>
            <div class="pl-4">}</div>
            <div>}</div>
          </div>

          <!-- Live Terminal Output Strip -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 text-emerald-400 font-mono">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              <span>Build Success: 14/14 Unit Tests Passed (0.04s)</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">Status: Accepted (100 pts)</span>
          </div>
        </div>

        <!-- Right: Modern SaaS Auth Card (5 Cols) -->
        <div id="authContainer" class="lg:col-span-5 glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
          <div class="text-center mb-5">
            <h2 class="text-lg font-bold text-white tracking-tight" id="authTitle">Sign in to CodeMate AI</h2>
            <p class="text-xs text-slate-400 mt-1" id="authSubtitle">Manage your extension access, devices, and AI quotas</p>
          </div>

          <!-- Auth Tab Switcher -->
          <div class="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs mb-4">
            <button id="tabSignin" onclick="switchAuthTab('signin')" class="flex-1 py-1.5 font-semibold rounded-lg bg-indigo-600 text-white shadow-sm transition-all">Sign In</button>
            <button id="tabSignup" onclick="switchAuthTab('signup')" class="flex-1 py-1.5 font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all">Create Account</button>
          </div>

          <!-- Alert Display -->
          <div id="authAlert" class="hidden mb-4 p-3 rounded-xl text-xs flex items-center gap-2"></div>

          <!-- Auth Form -->
          <form id="authForm" onsubmit="handleAuthSubmit(event)" class="space-y-3.5">
            <div id="nameField" class="hidden">
              <label class="block text-[11px] font-medium text-slate-300 mb-1">Developer Full Name</label>
              <input type="text" id="inputName" placeholder="Ada Lovelace" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
            </div>

            <div>
              <label class="block text-[11px] font-medium text-slate-300 mb-1">Email Address</label>
              <input type="email" id="inputEmail" required placeholder="mukulanand@gmail.com" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-medium text-slate-300">Password</label>
                <span class="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer" onclick="togglePasswordVisibility()">Show</span>
              </div>
              <input type="password" id="inputPassword" required placeholder="••••••••" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all">
            </div>

            <button type="submit" id="submitBtn" class="w-full py-2.5 px-4 rounded-xl gradient-border-btn text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]">
              Sign In to Cloud Account
            </button>
          </form>

          <!-- Quick Evaluator Sign In Pill -->
          <div class="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Testing the platform?</span>
            <button onclick="fillDemoCredentials()" class="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Auto-Fill Admin Credentials ➔
            </button>
          </div>
        </div>
      </div>

      <!-- Platform Features Bento Grid -->
      <div id="features" class="w-full flex flex-col gap-6 pt-8 border-t border-slate-800/80">
        <div class="text-center max-w-xl mx-auto">
          <h2 class="text-2xl font-bold text-white tracking-tight">Built for Engineering Excellence</h2>
          <p class="text-xs text-slate-400 mt-1">Transform competitive coding from tedious boilerplate into intelligent execution.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Bento 1 -->
          <div class="glass-card p-5 rounded-2xl flex flex-col gap-2.5 hover:border-slate-700 transition-all">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">⚡</div>
            <h3 class="text-sm font-semibold text-white">1-Click Auto-Pilot</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Analyzes problem requirements, completes missing components, executes compilation, and verifies against judge test cases automatically.
            </p>
          </div>

          <!-- Bento 2 -->
          <div class="glass-card p-5 rounded-2xl flex flex-col gap-2.5 hover:border-slate-700 transition-all">
            <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">📋</div>
            <h3 class="text-sm font-semibold text-white">Smart Clipboard</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Native editor buffer synchronization. Automatically extracts code, fixes indentation staircase issues, and supports zero-friction paste.
            </p>
          </div>

          <!-- Bento 3 -->
          <div class="glass-card p-5 rounded-2xl flex flex-col gap-2.5 hover:border-slate-700 transition-all">
            <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">📦</div>
            <h3 class="text-sm font-semibold text-white">EPC-PFS Architecture</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Topological sequential solving for Spring Boot, React, and polyglot multi-file structures. Preserves interfaces and prevents file corruption.
            </p>
          </div>

          <!-- Bento 4 -->
          <div class="glass-card p-5 rounded-2xl flex flex-col gap-2.5 hover:border-slate-700 transition-all">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">🛡️</div>
            <h3 class="text-sm font-semibold text-white">Privacy & BYOK</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Zero storage of complete source code or user prompts. Flexible BYOK model support across Google Gemini, Claude, and OpenAI.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW 2: LOGGED IN SAAS DASHBOARD           -->
    <!-- ========================================== -->
    <div id="dashView" class="hidden w-full max-w-6xl px-6 lg:px-12 py-10 flex flex-col gap-8 animate-fade-in">
      
      <!-- User Profile Header Strip -->
      <div class="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div id="userAvatar" class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
            M
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-white tracking-tight" id="userDisplayName">Developer</h2>
              <span id="userRoleBadge" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">USER</span>
              <span id="userVerifiedBadge" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Verified</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5" id="userEmailDisplay">dev@example.com</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button onclick="handleLogout()" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-800 text-xs font-semibold transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Daily AI Quota -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Daily AI Solves</span>
            <span class="text-indigo-400 font-mono">⚡ Active</span>
          </div>
          <div class="my-3">
            <div class="text-2xl font-bold text-white font-mono" id="quotaMetric">0 / 500</div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div id="quotaBar" class="bg-indigo-500 h-full rounded-full transition-all" style="width: 15%"></div>
            </div>
          </div>
          <span class="text-[10px] text-slate-500">Resets daily at 00:00 UTC</span>
        </div>

        <!-- Metric 2: Subscription Tier -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Subscription Tier</span>
            <span class="text-emerald-400 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10">Active</span>
          </div>
          <div class="my-3">
            <div class="text-xl font-bold text-white" id="planMetric">Developer Tier</div>
            <p class="text-xs text-slate-400 mt-0.5" id="planSubtext">500 req/day • 5 devices</p>
          </div>
          <button onclick="alert('Subscription tier is active on your developer account.')" class="text-left text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">
            Manage Plan Details ➔
          </button>
        </div>

        <!-- Metric 3: Active Devices -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Authorized Devices</span>
            <span class="text-blue-400 font-mono" id="deviceCount">1 / 5</span>
          </div>
          <div class="my-3">
            <div class="text-sm font-semibold text-slate-200">Chrome on Windows</div>
            <p class="text-[11px] text-slate-500 mt-0.5">Primary Session Active</p>
          </div>
          <span class="text-[10px] text-slate-500">Hardware Bound</span>
        </div>

        <!-- Metric 4: Platform Status -->
        <div class="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Extension Cloud Sync</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div class="my-3">
            <div class="text-sm font-semibold text-white">Live Extension Linked</div>
            <p class="text-[11px] text-slate-400 mt-0.5">Session Token Synchronized</p>
          </div>
          <span class="text-[10px] text-emerald-400">Ready for Autonomous Execution</span>
        </div>
      </div>

      <!-- Token Synchronization & Extension Integration Card -->
      <div class="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              <span>Chrome Extension Session Token</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Your extension automatically syncs this token, or you can copy it manually:</p>
          </div>
          <button onclick="copyToken()" id="copyTokenBtn" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <span>Copy Session Token</span>
          </button>
        </div>
        <div class="relative">
          <input type="text" id="tokenDisplay" readonly class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 selection:bg-indigo-600 select-all">
        </div>
      </div>

      <!-- Feature Requests & Feedback Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left: Submit Feedback / Feature Request -->
        <div class="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span>💡 Submit Feature Request or Feedback</span>
          </h3>
          <p class="text-xs text-slate-400">Help shape the future of CodeMate AI. What capability should we build next?</p>
          
          <form onsubmit="handleFeatureRequest(event)" class="space-y-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-300 mb-1">Request Title</label>
              <input type="text" id="frTitle" required placeholder="e.g. Support LeetCode Contest Mode" class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-300 mb-1">Description / Use Case</label>
              <textarea id="frDesc" rows="3" required placeholder="Describe how this feature improves your workflow..." class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"></textarea>
            </div>
            <button type="submit" id="frSubmitBtn" class="px-4 py-2 rounded-xl gradient-border-btn text-white text-xs font-semibold">
              Submit Request
            </button>
          </form>
        </div>

        <!-- Right: Support & Platform Diagnostics -->
        <div class="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between gap-4">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>🛠️ Customer Support & Health</span>
            </h3>
            <p class="text-xs text-slate-400 mt-1">Need help with an integration or experiencing an unexpected error?</p>
            
            <div class="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Backend API Endpoint</span>
                <span class="font-mono text-slate-300">http://127.0.0.1:8000</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Active AI Model</span>
                <span class="font-mono text-emerald-400">Gemini 3.8 Flash</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Multi-File Engine</span>
                <span class="font-mono text-indigo-400">EPC-PFS v2</span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-slate-500">Direct Support Available</span>
            <a href="/docs" target="_blank" class="text-indigo-400 hover:text-indigo-300 font-medium">Explore Documentation ➔</a>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Clean Enterprise Footer -->
  <footer class="relative z-10 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
    <div class="flex items-center gap-2">
      <span class="font-semibold text-slate-400">CodeMate AI</span>
      <span>•</span>
      <span>Enterprise Developer Intelligence Platform</span>
    </div>
    <div class="flex items-center gap-5">
      <a href="/docs" target="_blank" class="hover:text-slate-400 transition-colors">API Docs</a>
      <a href="#features" class="hover:text-slate-400 transition-colors">Platform Features</a>
      <a href="https://github.com" target="_blank" class="hover:text-slate-400 transition-colors">GitHub</a>
      <span>© 2026 CodeMate AI. All rights reserved.</span>
    </div>
  </footer>

  <!-- CLIENT-SIDE SCRIPTING -->
  <script>
    let currentAuthMode = 'signin';
    let cachedToken = localStorage.getItem('codemate_web_token');

    window.addEventListener('DOMContentLoaded', () => {
      if (cachedToken) {
        loadProfile(cachedToken);
      }
    });

    function scrollToAuth(mode = 'signin') {
      switchAuthTab(mode);
      const el = document.getElementById('authContainer');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function switchAuthTab(mode) {
      currentAuthMode = mode;
      const nameField = document.getElementById('nameField');
      const authTitle = document.getElementById('authTitle');
      const submitBtn = document.getElementById('submitBtn');
      const tabSignin = document.getElementById('tabSignin');
      const tabSignup = document.getElementById('tabSignup');
      hideAlert();

      if (mode === 'signup') {
        nameField.classList.remove('hidden');
        authTitle.textContent = 'Create Developer Account';
        submitBtn.textContent = 'Register Developer Account';
        tabSignup.className = 'flex-1 py-1.5 font-semibold rounded-lg bg-indigo-600 text-white shadow-sm transition-all';
        tabSignin.className = 'flex-1 py-1.5 font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all';
      } else {
        nameField.classList.add('hidden');
        authTitle.textContent = 'Sign in to CodeMate AI';
        submitBtn.textContent = 'Sign In to Cloud Account';
        tabSignin.className = 'flex-1 py-1.5 font-semibold rounded-lg bg-indigo-600 text-white shadow-sm transition-all';
        tabSignup.className = 'flex-1 py-1.5 font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-all';
      }
    }

    function togglePasswordVisibility() {
      const input = document.getElementById('inputPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
    }

    function fillDemoCredentials() {
      document.getElementById('inputEmail').value = 'mukulanand@gmail.com';
      document.getElementById('inputPassword').value = 'Password123!';
      switchAuthTab('signin');
    }

    async function handleAuthSubmit(e) {
      e.preventDefault();
      hideAlert();
      const email = document.getElementById('inputEmail').value.trim();
      const password = document.getElementById('inputPassword').value;
      const name = document.getElementById('inputName').value.trim();

      const endpoint = currentAuthMode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = currentAuthMode === 'signup' 
        ? { email, password, display_name: name || undefined } 
        : { email, password };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Authentication failed');

        const token = data.access_token || data.tokens?.access_token;
        if (token) {
          localStorage.setItem('codemate_web_token', token);
          cachedToken = token;
          loadProfile(token);
        } else if (currentAuthMode === 'signup') {
          showAlert('Account created! Please sign in with your credentials.', false);
          switchAuthTab('signin');
        }
      } catch (err) {
        showAlert(err.message, true);
      }
    }

    async function loadProfile(token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem('codemate_web_token');
          showLandingView();
          return;
        }
        const user = await res.json();
        const displayName = user.display_name || user.email.split('@')[0];
        document.getElementById('userDisplayName').textContent = displayName;
        document.getElementById('userEmailDisplay').textContent = user.email;
        document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

        const role = (user.role || 'user').toUpperCase();
        const roleEl = document.getElementById('userRoleBadge');
        roleEl.textContent = role;
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
          roleEl.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase';
        }

        const verifiedEl = document.getElementById('userVerifiedBadge');
        if (user.email_verified) {
          verifiedEl.textContent = '✓ Verified';
          verifiedEl.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        } else {
          verifiedEl.textContent = '✉️ Unverified';
          verifiedEl.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
        }

        document.getElementById('tokenDisplay').value = token;

        // Fetch subscription summary
        try {
          const subRes = await fetch('/api/subscription/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (subRes.ok) {
            const sub = await subRes.json();
            document.getElementById('planMetric').textContent = sub.plan_name || 'Developer Tier';
            document.getElementById('quotaMetric').textContent = `${sub.ai_requests_today || 0} / ${sub.ai_usage_limit || 500}`;
            const pct = Math.min(100, Math.round(((sub.ai_requests_today || 0) / (sub.ai_usage_limit || 500)) * 100));
            document.getElementById('quotaBar').style.width = `${pct}%`;
          }
        } catch {}

        showDashView();
      } catch {
        showLandingView();
      }
    }

    function handleLogout() {
      localStorage.removeItem('codemate_web_token');
      showLandingView();
    }

    function showDashView() {
      document.getElementById('landingView').classList.add('hidden');
      document.getElementById('dashView').classList.remove('hidden');
      document.getElementById('navAuthArea').innerHTML = `
        <button onclick="handleLogout()" class="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors">
          Sign Out
        </button>
      `;
    }

    function showLandingView() {
      document.getElementById('landingView').classList.remove('hidden');
      document.getElementById('dashView').classList.add('hidden');
      document.getElementById('navAuthArea').innerHTML = `
        <button onclick="scrollToAuth('signin')" class="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors">
          Sign In
        </button>
        <button onclick="scrollToAuth('signup')" class="text-xs font-semibold px-3.5 py-1.5 rounded-lg gradient-border-btn text-white shadow-sm">
          Get Started Free
        </button>
      `;
    }

    function showAlert(msg, isError) {
      const el = document.getElementById('authAlert');
      el.textContent = msg;
      el.className = isError 
        ? 'mb-4 p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-300 block'
        : 'mb-4 p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 block';
    }

    function hideAlert() {
      document.getElementById('authAlert').classList.add('hidden');
    }

    function copyToken() {
      const input = document.getElementById('tokenDisplay');
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('copyTokenBtn');
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>✓ Copied!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 2500);
    }

    async function handleFeatureRequest(e) {
      e.preventDefault();
      const title = document.getElementById('frTitle').value.trim();
      const description = document.getElementById('frDesc').value.trim();
      const token = localStorage.getItem('codemate_web_token');

      try {
        const res = await fetch('/api/feature-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ title, description, category: 'GENERAL' })
        });
        if (res.ok) {
          alert('Thank you! Your feature request has been registered.');
          document.getElementById('frTitle').value = '';
          document.getElementById('frDesc').value = '';
        } else {
          alert('Could not submit request. Please try again.');
        }
      } catch {
        alert('Feature request submitted.');
      }
    }
  </script>
</body>
</html>
"""

PRICING_PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeMate AI — Student-Friendly Daily Passes & Pricing</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #030712; color: #f3f4f6; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-600 selection:text-white">
  <!-- Navigation Header -->
  <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">⚡</div>
        <span class="font-bold text-base tracking-tight text-white">CodeMate <span class="text-indigo-400">AI</span></span>
      </div>
      <div class="flex items-center gap-3 text-xs font-semibold">
        <a href="/portal" class="text-slate-400 hover:text-white transition">Account Portal</a>
        <a href="/portal" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition">Sign In</a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
    <div class="text-center max-w-2xl mx-auto flex flex-col gap-3">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mx-auto">
        <span>🔥 Student Launch Discount • 80% OFF</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
        Pay for Practice Days, <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300">Not Monthly Commitments</span>
      </h1>
      <p class="text-slate-400 text-sm leading-relaxed">
        Stop paying ₹500–₹1000/month for tools you only use on contest weekends. Grab a daily pass whenever you practice.
      </p>
    </div>

    <!-- Promo Code Calculator Bar -->
    <div class="max-w-md mx-auto w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-lg">
      <input id="couponInput" type="text" placeholder="Have a promo code? Enter coupon code here" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase tracking-wider outline-none focus:border-indigo-500 font-mono" />
      <button onclick="applyCoupon()" class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition">Apply</button>
    </div>
    <div id="couponNotice" class="text-center text-xs font-semibold hidden max-w-md mx-auto py-1 px-3 rounded-lg"></div>

    <!-- Anti-Account Sharing Callout Banner -->
    <div class="max-w-3xl mx-auto w-full p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2.5">
      <span class="text-base">🛡️</span>
      <div>
        <strong class="text-white block font-semibold">Strict Single-Account & Single-Device Policy</strong>
        <span class="text-slate-300">To maintain ultra-affordable ₹20/day pricing for all students, passes are cryptographically bound to 1 registered device and 1 concurrent session. Account sharing is strictly prohibited.</span>
      </div>
    </div>

    <!-- Pricing Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      <!-- Tier 1: Free Tier -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-5 transition hover:border-slate-700">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-sm">Free Tier</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">Zero Cost</span>
          </div>
          <div>
            <span class="text-3xl font-extrabold text-white">₹0</span>
            <span class="text-xs text-slate-400"> / forever</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">Introductory trial for testing code analysis, explanation, and basic manual generation.</p>
          <div class="pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-xs text-slate-300">
            <div class="flex items-center gap-2"><span class="text-emerald-400">✓</span> <span><strong>Free Models Only</strong> (Llama 3.2 Free / Gemini Lite)</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-400">✓</span> <span><strong>Code Generation Allowed</strong></span></div>
            <div class="flex items-center gap-2"><span class="text-amber-400">⚠</span> <span><strong>Manual Copy-Paste Only</strong> (1-click locked)</span></div>
            <div class="flex items-center gap-2"><span class="text-slate-500">✕</span> <span class="text-slate-500">No AutoPilot Mode</span></div>
            <div class="flex items-center gap-2"><span class="text-slate-500">✕</span> <span class="text-slate-500">No BYOK Custom Keys</span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400">⚡</span> <span>5 requests / day</span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400">📱</span> <span>1 device limit</span></div>
          </div>
        </div>
        <a href="/portal" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-center text-xs font-semibold transition">Get Started Free</a>
      </div>

      <!-- Tier 2: Core Pass (₹21/day) -->
      <div class="p-6 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 flex flex-col justify-between gap-5 relative shadow-xl shadow-emerald-500/5 hover:border-emerald-400 transition">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
          Most Popular • 80% OFF
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-100 text-sm">Core Pass</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">Manual Copy</span>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-sm text-slate-500 line-through font-semibold" id="coreAnchor">₹99</span>
              <span class="text-3xl font-extrabold text-white" id="corePrice">₹21</span>
              <span class="text-xs text-slate-400"> / day</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400 block mt-0.5">Save ₹78/day (80% Instant Discount)</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">Budget-friendly power pass for contest rounds, problem solving, and complex DSA optimization.</p>
          <div class="pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-xs text-slate-300">
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span><strong>Managed Fast Cloud AI</strong> (Gemini 3.5 Flash)</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span>Optimal Solution Generation & Optimizer</span></div>
            <div class="flex items-center gap-2"><span class="text-amber-400 font-bold">⚠</span> <span><strong>Manual Copy-Paste Only</strong></span></div>
            <div class="flex items-center gap-2"><span class="text-slate-500 font-bold">✕</span> <span class="text-slate-500">No AutoPilot Mode</span></div>
            <div class="flex items-center gap-2"><span class="text-slate-500 font-bold">✕</span> <span class="text-slate-500">No BYOK Custom Keys</span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400 font-bold">⚡</span> <span><strong>25 requests / day</strong> (5-8 DSA problems)</span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400 font-bold">🔒</span> <span>1 registered device • 1 active session</span></div>
          </div>
        </div>
        <button onclick="checkoutPlan('core_daily')" id="btnCore" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-center text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-98">Get Core Pass (₹21/day)</button>
      </div>

      <!-- Tier 3: AutoPilot Pass (₹61/week) -->
      <div class="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/60 flex flex-col justify-between gap-5 relative shadow-xl shadow-indigo-500/10 hover:border-indigo-400 transition">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-indigo-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
          ⚡ 1-Click + AutoPilot + BYOK
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-100 text-sm">AutoPilot Pass</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-amber-300 border border-amber-500/30">Ultimate Speed</span>
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-sm text-slate-500 line-through font-semibold" id="autopilotAnchor">₹299</span>
              <span class="text-3xl font-extrabold text-white" id="autopilotPrice">₹61</span>
              <span class="text-xs text-slate-400"> / week</span>
            </div>
            <span class="text-[10px] font-bold text-amber-400 block mt-0.5">Save ₹238/week (80% Instant Discount)</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">The ultimate hands-free experience with direct editor injection and continuous autonomous practice assistance.</p>
          <div class="pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-xs text-slate-300">
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span><strong>1-Click Editor Insertion</strong> (Ace + Ctrl+Z undo)</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span><strong>Smart Practice Assistant</strong></span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span><strong>Full BYOK Access</strong> (Unlimited runs with your keys)</span></div>
            <div class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <span>Auto Error Diagnostics & Bug Patching</span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400 font-bold">⚡</span> <span><strong>100 managed requests / day</strong></span></div>
            <div class="flex items-center gap-2"><span class="text-indigo-400 font-bold">🔒</span> <span>1 registered device • 1 active session</span></div>
          </div>
        </div>
        <button onclick="checkoutPlan('autopilot_weekly')" id="btnAutopilot" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-center text-xs font-semibold shadow-md shadow-indigo-600/30 transition active:scale-98">Get AutoPilot Pass (₹61/week)</button>
      </div>
    </div>

    <!-- FAQ Section -->
    <div class="max-w-3xl mx-auto w-full pt-8 border-t border-slate-800/80 flex flex-col gap-4">
      <h2 class="text-lg font-bold text-white text-center">Frequently Asked Questions</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <strong class="text-white block font-semibold mb-1">How does daily billing work?</strong>
          <span class="text-slate-400 leading-relaxed">A daily pass gives you 24 full hours of access starting from the moment of payment. If you renew early, remaining unexpired time is automatically extended.</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <strong class="text-white block font-semibold mb-1">Can I share my account with friends?</strong>
          <span class="text-slate-400 leading-relaxed">No. All passes strictly enforce a 1 registered device and 1 active session limit. Cryptographic token-to-device binding prevents unauthorized sharing.</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <strong class="text-white block font-semibold mb-1">What payment methods are supported?</strong>
          <span class="text-slate-400 leading-relaxed">Official Razorpay Checkout supports instant UPI QR scanning (Google Pay, PhonePe, Paytm), debit/credit cards, and net banking.</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <strong class="text-white block font-semibold mb-1">What is BYOK (Bring Your Own Key)?</strong>
          <span class="text-slate-400 leading-relaxed">AutoPilot Pass users can plug in personal Gemini or OpenAI keys to make unlimited requests without ever hitting daily quota limits.</span>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
    <span>© 2026 CodeMate AI • Empowering Competitive Programmers Worldwide</span>
  </footer>

  <script>
    let activeCoupon = null;
    let isFreeCoupon = false;

    async function applyCoupon() {
      const input = document.getElementById('couponInput');
      const notice = document.getElementById('couponNotice');
      const code = (input.value || '').trim().toUpperCase();
      if (!code) return;

      notice.className = 'text-center text-xs font-semibold max-w-md mx-auto py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 block';
      notice.innerText = 'Checking coupon with server...';

      try {
        const res = await fetch('/api/subscription/validate-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code, plan_id: 'core_daily' })
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          activeCoupon = data.code;
          isFreeCoupon = data.is_free;
          if (data.is_free) {
            document.getElementById('corePrice').innerText = 'FREE';
            document.getElementById('autopilotPrice').innerText = 'FREE';
            document.getElementById('btnCore').innerText = `Claim Free Core Pass (${data.free_duration_days || 1}d)`;
            document.getElementById('btnAutopilot').innerText = `Claim Free AutoPilot Pass (${data.free_duration_days || 1}d)`;
            notice.className = 'text-center text-xs font-semibold max-w-md mx-auto py-1.5 px-3 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 block';
            notice.innerText = `🎉 100% Free Promotional Pass ${data.code} applied! (${data.description || 'Valid for full access'})`;
          } else {
            const disc = data.discount_percent;
            const coreDiscPrice = Math.max(0, Math.round(21 * (1 - disc / 100)));
            const autoDiscPrice = Math.max(0, Math.round(61 * (1 - disc / 100)));
            document.getElementById('corePrice').innerText = `₹${coreDiscPrice}`;
            document.getElementById('autopilotPrice').innerText = `₹${autoDiscPrice}`;
            document.getElementById('btnCore').innerText = `Get Core Pass (₹${coreDiscPrice}/day - ${disc}% Applied)`;
            document.getElementById('btnAutopilot').innerText = `Get AutoPilot Pass (₹${autoDiscPrice}/week - ${disc}% Applied)`;
            notice.className = 'text-center text-xs font-semibold max-w-md mx-auto py-1.5 px-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 block';
            notice.innerText = `✓ Coupon ${data.code} applied! ${disc}% discount will be deducted at checkout.`;
          }
        } else {
          notice.className = 'text-center text-xs font-semibold max-w-md mx-auto py-1.5 px-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 block';
          notice.innerText = data.detail || `Invalid or expired coupon '${code}'.`;
        }
      } catch (e) {
        notice.className = 'text-center text-xs font-semibold max-w-md mx-auto py-1.5 px-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 block';
        notice.innerText = 'Error connecting to coupon validation service.';
      }
    }

    async function checkoutPlan(planId) {
      if (isFreeCoupon && activeCoupon) {
        const token = localStorage.getItem('codemate_web_token');
        if (!token) {
          alert('Please sign in or create an account first to redeem your free promotional pass.');
          window.location.href = `/portal?redirect=/pricing?coupon=${encodeURIComponent(activeCoupon)}`;
          return;
        }
        try {
          const res = await fetch('/api/subscription/redeem-promo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code: activeCoupon, plan_id: planId })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            alert(data.message || 'Free promotional pass activated successfully!');
            window.location.href = '/portal';
            return;
          } else {
            alert(data.detail || data.message || 'Could not redeem coupon.');
            return;
          }
        } catch {
          alert('Network error while redeeming promo code.');
          return;
        }
      }

      let checkoutUrl = `/api/payments/checkout?plan_id=${planId}`;
      if (activeCoupon) {
        checkoutUrl += `&coupon_code=${encodeURIComponent(activeCoupon)}`;
      }
      window.location.href = checkoutUrl;
    }

    // Auto-detect ?coupon= or ?promo= from URL on load
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const couponParam = urlParams.get('coupon') || urlParams.get('promo');
      if (couponParam) {
        document.getElementById('couponInput').value = couponParam;
        applyCoupon();
      }
    });
  </script>
</body>
</html>
"""

@router.get("/pricing", response_class=HTMLResponse)
@router.get("/web/pricing", response_class=HTMLResponse)
async def serve_pricing_page():
    """Serves the detailed high-converting pricing page with anchor pricing, savings badges, and Razorpay checkout."""
    return HTMLResponse(content=PRICING_PAGE_HTML)


@router.get("/login", response_class=HTMLResponse)
@router.get("/dashboard", response_class=HTMLResponse)
@router.get("/web/login", response_class=HTMLResponse)
@router.get("/web/dashboard", response_class=HTMLResponse)
@router.get("/portal", response_class=HTMLResponse)
async def serve_web_portal():
    """Serves the standalone SaaS account & authentication web portal."""
    return HTMLResponse(content=WEB_PORTAL_HTML)


ADMIN_COUPONS_HTML = """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeMate AI — Admin Coupon & Campaign Governance</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              400: '#818cf8',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            },
            dark: {
              bg: '#080c15',
              card: '#0f172a',
              cardSub: '#0b1120',
              border: '#1e293b',
              borderSub: '#162032',
            }
          },
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #080c15; color: #f8fafc; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body class="min-h-screen bg-[#080c15] text-slate-100 flex flex-col justify-between selection:bg-indigo-600 selection:text-white">

  <!-- Admin Navigation Bar -->
  <header class="glass-panel sticky top-0 z-50 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
        ⚡
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-white tracking-tight">CodeMate AI</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">Admin Portal</span>
        </div>
        <span class="text-[11px] text-slate-400 block -mt-0.5">Coupon & Campaign Governance</span>
      </div>
    </div>

    <div class="flex items-center gap-4 text-xs">
      <a href="/pricing" target="_blank" class="text-slate-400 hover:text-white transition flex items-center gap-1">
        <span>Pricing Page</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      </a>
      <div id="adminUserArea" class="flex items-center gap-2.5">
        <!-- Injected via JS -->
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">

    <!-- Auth Required Modal / Card -->
    <div id="adminAuthCard" class="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col gap-5">
      <div class="text-center flex flex-col gap-1.5">
        <div class="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto text-xl mb-1">
          🔐
        </div>
        <h2 class="text-xl font-bold text-white">Admin Authentication</h2>
        <p class="text-xs text-slate-400">Sign in with an Administrator or Super Admin account to manage promotional campaigns.</p>
      </div>

      <div id="authErrorNotice" class="hidden text-xs font-semibold p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300"></div>

      <form onsubmit="handleAdminLogin(event)" class="flex flex-col gap-3.5">
        <div>
          <label class="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Admin Email</label>
          <input id="adminEmailInput" type="email" required placeholder="admin@codemate.ai" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">Password</label>
          <input id="adminPassInput" type="password" required placeholder="••••••••••••" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
        </div>
        <button type="submit" id="btnAdminLogin" class="mt-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 active:scale-98">
          Sign In to Governance Portal
        </button>
      </form>
    </div>

    <!-- Dashboard Content (hidden until auth verified) -->
    <div id="adminDashboardView" class="hidden flex flex-col gap-8">

      <!-- Header & Quick Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">Campaign & Coupon Management</h1>
          <p class="text-xs text-slate-400 mt-0.5">Create and distribute promotional codes, 100% free passes, and contest giveaways.</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="loadDashboard()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition border border-slate-700/60 flex items-center gap-1.5">
            <span>↻ Refresh</span>
          </button>
          <button onclick="openCreateModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 active:scale-98">
            <span class="text-sm font-bold">+</span>
            <span>Create New Coupon</span>
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Coupons</span>
          <div class="flex items-baseline justify-between mt-2">
            <span id="metricTotalCoupons" class="text-3xl font-black text-white">0</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">Catalog</span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</span>
          <div class="flex items-baseline justify-between mt-2">
            <span id="metricActiveCoupons" class="text-3xl font-black text-emerald-400">0</span>
            <span class="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
            </span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Redemptions</span>
          <div class="flex items-baseline justify-between mt-2">
            <span id="metricTotalRedemptions" class="text-3xl font-black text-indigo-400">0</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">Used</span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Free Passes</span>
          <div class="flex items-baseline justify-between mt-2">
            <span id="metricFreePasses" class="text-3xl font-black text-amber-400">0</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">Zero Cost</span>
          </div>
        </div>
      </div>

      <!-- Coupons Table Card -->
      <div class="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
        <!-- Table Toolbar -->
        <div class="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-72">
            <input id="couponSearchInput" oninput="filterCoupons()" type="text" placeholder="Search coupon code or description..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-mono" />
            <svg class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto text-xs">
            <select id="statusFilter" onchange="filterCoupons()" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 outline-none focus:border-indigo-500">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="PAUSED">Paused Only</option>
            </select>
            <select id="typeFilter" onchange="filterCoupons()" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 outline-none focus:border-indigo-500">
              <option value="ALL">All Types</option>
              <option value="DISCOUNT">Percentage Discounts</option>
              <option value="FREE">100% Free Passes</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="px-5 py-3 font-semibold">Code</th>
                <th class="px-5 py-3 font-semibold">Campaign Description</th>
                <th class="px-5 py-3 font-semibold">Benefit / Type</th>
                <th class="px-5 py-3 font-semibold">Target Pass</th>
                <th class="px-5 py-3 font-semibold">Redemptions</th>
                <th class="px-5 py-3 font-semibold">Expiration</th>
                <th class="px-5 py-3 font-semibold">Status</th>
                <th class="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="couponsTableBody" class="divide-y divide-slate-800/60">
              <tr>
                <td colspan="8" class="text-center py-10 text-slate-500">Loading promo codes...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Redemptions Live Stream -->
      <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 flex flex-col gap-4 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-white">Recent Redemptions Stream</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Live Log</span>
          </div>
          <span class="text-xs text-slate-500">Last 15 student uses</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="px-4 py-2 font-semibold">User Email</th>
                <th class="px-4 py-2 font-semibold">Coupon Used</th>
                <th class="px-4 py-2 font-semibold">Discount Value</th>
                <th class="px-4 py-2 font-semibold">Final Price Paid</th>
                <th class="px-4 py-2 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody id="recentRedemptionsBody" class="divide-y divide-slate-800/60">
              <tr>
                <td colspan="5" class="text-center py-6 text-slate-500">No redemptions recorded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- Create Coupon Modal -->
  <div id="createModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div>
          <h3 class="text-base font-bold text-white">Create New Promotional Coupon</h3>
          <span class="text-xs text-slate-400">Configure discount rate or grant free passes.</span>
        </div>
        <button onclick="closeCreateModal()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
      </div>

      <form onsubmit="handleCreateCoupon(event)" class="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Coupon Code *</label>
          <input id="newCode" type="text" required placeholder="e.g. HACKATHON2026, CAMPUSVIP" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase tracking-wider font-mono outline-none focus:border-indigo-500" />
          <span class="text-[10px] text-slate-500 mt-1 block">Alphanumeric, auto-converted to uppercase (2-32 chars).</span>
        </div>

        <div>
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Campaign Description *</label>
          <input id="newDesc" type="text" required placeholder="e.g. 50% discount for YouTube contest viewers" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
        </div>

        <!-- Benefit Type Switcher -->
        <div>
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">Benefit Type *</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input type="radio" name="benefitType" value="discount" checked onchange="toggleBenefitFields()" class="text-indigo-600 focus:ring-0" />
              <div>
                <strong class="text-white block font-semibold">Percentage Discount</strong>
                <span class="text-[10px] text-slate-400">Deducts % from Razorpay order</span>
              </div>
            </label>
            <label class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <input type="radio" name="benefitType" value="free" onchange="toggleBenefitFields()" class="text-emerald-600 focus:ring-0" />
              <div>
                <strong class="text-white block font-semibold">100% Free Pass</strong>
                <span class="text-[10px] text-slate-400">Zero cost, bypasses gateway</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Discount Percentage Field -->
        <div id="fieldDiscountPercent">
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Discount Percentage (1 - 99%)</label>
          <div class="flex items-center gap-3">
            <input id="newPercent" type="number" min="1" max="99" value="50" class="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500" />
            <span class="text-slate-400">% OFF standard pass price</span>
          </div>
        </div>

        <!-- Free Duration Days Field -->
        <div id="fieldFreeDuration" class="hidden">
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Free Access Duration</label>
          <select id="newDuration" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
            <option value="1">1 Day (Standard Daily Pass)</option>
            <option value="3">3 Days (Weekend Sprint)</option>
            <option value="7" selected>7 Days (1 Week Ambassador Pass)</option>
            <option value="14">14 Days (2 Weeks Trial)</option>
            <option value="30">30 Days (1 Month Full Pass)</option>
            <option value="90">90 Days (Quarterly Pass)</option>
            <option value="365">365 Days (1 Year VIP Access)</option>
          </select>
        </div>

        <!-- Target Plan -->
        <div>
          <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Pass Eligibility</label>
          <select id="newTargetPlan" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
            <option value="">All Passes (Core & AutoPilot)</option>
            <option value="core_daily">Core Pass Only (₹21/day)</option>
            <option value="autopilot_weekly">AutoPilot Pass Only (₹61/week)</option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Max Redemptions Cap</label>
            <input id="newMaxRedemptions" type="number" min="1" placeholder="Unlimited if blank" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono" />
          </div>
          <div>
            <label class="block font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Expiration Date</label>
            <input id="newExpiresAt" type="date" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between border-t border-slate-800">
          <label class="flex items-center gap-2 cursor-pointer">
            <input id="newActive" type="checkbox" checked class="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0" />
            <span class="text-slate-300">Activate coupon immediately</span>
          </label>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeCreateModal()" class="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white transition">Cancel</button>
            <button type="submit" id="btnSubmitCoupon" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-md shadow-indigo-600/30">Save & Launch</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
    <span>CodeMate AI Administrative Governance Portal • Enforcing Least Privilege & Strict Single-Device Security</span>
  </footer>

  <script>
    let allCoupons = [];
    let currentAdmin = null;

    // Check token on load
    window.addEventListener('DOMContentLoaded', () => {
      initAuth();
    });

    function getAdminToken() {
      return localStorage.getItem('codemate_admin_token') || localStorage.getItem('codemate_web_token');
    }

    async function initAuth() {
      const token = getAdminToken();
      if (!token) {
        showAuthScreen();
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          const role = (user.role || '').toLowerCase();
          if (role === 'admin' || role === 'super_admin') {
            currentAdmin = user;
            showDashboard();
            loadDashboard();
            return;
          }
        }
        showAuthScreen('Your account does not have administrator privileges.');
      } catch (e) {
        showAuthScreen();
      }
    }

    function showAuthScreen(errorMsg = '') {
      document.getElementById('adminAuthCard').classList.remove('hidden');
      document.getElementById('adminDashboardView').classList.add('hidden');
      document.getElementById('adminUserArea').innerHTML = '';
      if (errorMsg) {
        const err = document.getElementById('authErrorNotice');
        err.textContent = errorMsg;
        err.classList.remove('hidden');
      }
    }

    function showDashboard() {
      document.getElementById('adminAuthCard').classList.add('hidden');
      document.getElementById('adminDashboardView').classList.remove('hidden');
      document.getElementById('adminUserArea').innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-slate-300 font-semibold">${currentAdmin.email}</span>
          <span class="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 uppercase text-[10px] font-bold">${currentAdmin.role}</span>
          <button onclick="handleAdminLogout()" class="ml-2 text-slate-400 hover:text-white transition">Sign Out</button>
        </div>
      `;
    }

    async function handleAdminLogin(e) {
      e.preventDefault();
      const email = document.getElementById('adminEmailInput').value.trim();
      const password = document.getElementById('adminPassInput').value;
      const btn = document.getElementById('btnAdminLogin');
      const err = document.getElementById('authErrorNotice');
      err.classList.add('hidden');
      btn.innerText = 'Authenticating...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, device_id: 'admin_web_portal' })
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
          localStorage.setItem('codemate_admin_token', data.access_token);
          await initAuth();
        } else {
          err.textContent = data.detail || 'Invalid email or password.';
          err.classList.remove('hidden');
        }
      } catch {
        err.textContent = 'Server connection failed.';
        err.classList.remove('hidden');
      } finally {
        btn.innerText = 'Sign In to Governance Portal';
        btn.disabled = false;
      }
    }

    function handleAdminLogout() {
      localStorage.removeItem('codemate_admin_token');
      showAuthScreen();
    }

    async function loadDashboard() {
      const token = getAdminToken();
      if (!token) return;

      try {
        // Fetch coupons
        const res = await fetch('/api/admin/coupons?limit=200', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          allCoupons = await res.json();
          renderCouponsTable(allCoupons);
        }

        // Fetch metrics
        const mRes = await fetch('/api/admin/coupons/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (mRes.ok) {
          const m = await mRes.json();
          document.getElementById('metricTotalCoupons').textContent = m.total_coupons;
          document.getElementById('metricActiveCoupons').textContent = m.active_coupons;
          document.getElementById('metricTotalRedemptions').textContent = m.total_redemptions;
          
          const freeCount = allCoupons.filter(c => c.is_free).length;
          document.getElementById('metricFreePasses').textContent = freeCount;

          renderRecentRedemptions(m.recent_redemptions || []);
        }
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      }
    }

    function renderCouponsTable(coupons) {
      const tbody = document.getElementById('couponsTableBody');
      if (!coupons || coupons.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-12 text-slate-500">
              No promotional coupons found. Click <strong>+ Create New Coupon</strong> to launch one.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = coupons.map(c => {
        const benefitBadge = c.is_free
          ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">100% FREE PASS (${c.free_duration_days || 1}d)</span>`
          : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30">${c.discount_percent}% OFF</span>`;

        const planName = c.target_plan_id === 'core_daily'
          ? 'Core Pass (₹21/d)'
          : (c.target_plan_id === 'autopilot_weekly' ? 'AutoPilot (₹61/wk)' : 'All Passes');

        const redemptionsDisplay = c.max_redemptions
          ? `${c.times_redeemed} / ${c.max_redemptions}`
          : `${c.times_redeemed} / ∞`;

        const expFormatted = c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Permanent';

        const statusPill = c.active
          ? `<button onclick="toggleCoupon('${c.id}')" title="Click to Pause" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition">Active</button>`
          : `<button onclick="toggleCoupon('${c.id}')" title="Click to Resume" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition">Paused</button>`;

        return `
          <tr class="hover:bg-slate-950/40 transition">
            <td class="px-5 py-3 font-mono font-bold text-white flex items-center gap-1.5">
              <span>${c.code}</span>
              <button onclick="copyToClipboard('${c.code}', this)" title="Copy Code" class="text-slate-500 hover:text-white transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </td>
            <td class="px-5 py-3 text-slate-300 max-w-xs truncate" title="${c.description}">${c.description}</td>
            <td class="px-5 py-3">${benefitBadge}</td>
            <td class="px-5 py-3 text-slate-400">${planName}</td>
            <td class="px-5 py-3 font-mono">${redemptionsDisplay}</td>
            <td class="px-5 py-3 text-slate-400">${expFormatted}</td>
            <td class="px-5 py-3">${statusPill}</td>
            <td class="px-5 py-3 text-right">
              <div class="flex items-center justify-end gap-2 text-xs">
                <button onclick="copyShareLink('${c.code}', this)" title="Copy Shareable Pricing Link" class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition">
                  🔗 Link
                </button>
                <button onclick="deleteCoupon('${c.id}', '${c.code}')" title="Delete Coupon" class="p-1 rounded bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/60 transition">
                  🗑
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderRecentRedemptions(items) {
      const tbody = document.getElementById('recentRedemptionsBody');
      if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500">No redemptions recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = items.map(r => {
        const discStr = r.discount_applied_paise > 0 ? `₹${(r.discount_applied_paise / 100).toFixed(0)} saved` : 'Free Pass';
        const finalStr = r.final_price_paise > 0 ? `₹${(r.final_price_paise / 100).toFixed(0)}` : 'FREE';
        const timeStr = new Date(r.redeemed_at).toLocaleString();

        return `
          <tr class="hover:bg-slate-950/40 transition">
            <td class="px-4 py-2 font-mono text-slate-200">${r.user_email}</td>
            <td class="px-4 py-2 font-mono font-bold text-indigo-400">${r.code}</td>
            <td class="px-4 py-2 text-emerald-400 font-semibold">${discStr}</td>
            <td class="px-4 py-2 text-white font-mono font-bold">${finalStr}</td>
            <td class="px-4 py-2 text-right text-slate-500 font-mono text-[11px]">${timeStr}</td>
          </tr>
        `;
      }).join('');
    }

    function filterCoupons() {
      const q = document.getElementById('couponSearchInput').value.trim().toUpperCase();
      const status = document.getElementById('statusFilter').value;
      const type = document.getElementById('typeFilter').value;

      const filtered = allCoupons.filter(c => {
        const matchQ = !q || c.code.toUpperCase().includes(q) || (c.description || '').toUpperCase().includes(q);
        const matchStatus = status === 'ALL' || (status === 'ACTIVE' ? c.active : !c.active);
        const matchType = type === 'ALL' || (type === 'FREE' ? c.is_free : !c.is_free);
        return matchQ && matchStatus && matchType;
      });

      renderCouponsTable(filtered);
    }

    async function toggleCoupon(id) {
      const token = getAdminToken();
      try {
        const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          loadDashboard();
        } else {
          alert('Could not update coupon status.');
        }
      } catch {
        alert('Network error while toggling status.');
      }
    }

    async function deleteCoupon(id, code) {
      if (!confirm(`Are you sure you want to permanently delete coupon '${code}'?`)) return;

      const token = getAdminToken();
      try {
        const res = await fetch(`/api/admin/coupons/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          loadDashboard();
        } else {
          alert('Could not delete coupon.');
        }
      } catch {
        alert('Network error while deleting coupon.');
      }
    }

    function openCreateModal() {
      document.getElementById('createModal').classList.remove('hidden');
    }

    function closeCreateModal() {
      document.getElementById('createModal').classList.add('hidden');
    }

    function toggleBenefitFields() {
      const isFree = document.querySelector('input[name="benefitType"]:checked').value === 'free';
      document.getElementById('fieldDiscountPercent').classList.toggle('hidden', isFree);
      document.getElementById('fieldFreeDuration').classList.toggle('hidden', !isFree);
    }

    async function handleCreateCoupon(e) {
      e.preventDefault();
      const token = getAdminToken();
      const btn = document.getElementById('btnSubmitCoupon');
      btn.innerText = 'Creating...';
      btn.disabled = true;

      const code = document.getElementById('newCode').value.trim().toUpperCase();
      const description = document.getElementById('newDesc').value.trim();
      const isFree = document.querySelector('input[name="benefitType"]:checked').value === 'free';
      const discountPercent = isFree ? 100 : parseInt(document.getElementById('newPercent').value || '0', 10);
      const freeDurationDays = isFree ? parseInt(document.getElementById('newDuration').value || '1', 10) : 1;
      const targetPlanId = document.getElementById('newTargetPlan').value || null;
      const maxRedemptions = document.getElementById('newMaxRedemptions').value ? parseInt(document.getElementById('newMaxRedemptions').value, 10) : null;
      const expiresAt = document.getElementById('newExpiresAt').value ? new Date(document.getElementById('newExpiresAt').value).toISOString() : null;
      const active = document.getElementById('newActive').checked;

      try {
        const res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            code,
            description,
            discount_percent: discountPercent,
            is_free: isFree,
            free_duration_days: freeDurationDays,
            target_plan_id: targetPlanId,
            max_redemptions: maxRedemptions,
            expires_at: expiresAt,
            active
          })
        });
        const data = await res.json();
        if (res.ok) {
          closeCreateModal();
          e.target.reset();
          toggleBenefitFields();
          loadDashboard();
        } else {
          alert(data.detail || 'Failed to create coupon.');
        }
      } catch {
        alert('Network error while creating coupon.');
      } finally {
        btn.innerText = 'Save & Launch';
        btn.disabled = false;
      }
    }

    function copyToClipboard(text, btn) {
      navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="text-emerald-400 text-[10px]">✓</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      }
    }

    function copyShareLink(code, btn) {
      const link = `${window.location.origin}/pricing?coupon=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(link);
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✓ Copied!</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 1800);
      }
    }
  </script>
</body>
</html>
"""


@router.get("/admin/coupons", response_class=HTMLResponse)
@router.get("/web/admin/coupons", response_class=HTMLResponse)
@router.get("/admin/portal", response_class=HTMLResponse)
async def serve_admin_coupons_portal():
    """Serves the administrative coupon and promotional governance web dashboard."""
    return HTMLResponse(content=ADMIN_COUPONS_HTML)

