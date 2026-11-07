"""
CodeMate AI — Silicon Valley SaaS Web Portal & Dashboard (web_portal.py)
Provides a world-class landing page, enterprise authentication, and comprehensive SaaS dashboard
for account management, AI usage quotas, device sync, subscriptions, feature requests, and support.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Web Portal"])

WEB_PORTAL_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeMate — The Intelligent Coding Workspace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* ==========================================================================
       CodeMate Modern Silicon Valley Design System (Zero Tailwind CDN Dependency)
       ========================================================================== */
    :root {
      --bg: #07090e;
      --bg-surface: #0e131f;
      --bg-card: rgba(14, 19, 31, 0.75);
      --bg-card-hover: rgba(20, 27, 45, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(99, 102, 241, 0.5);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius-sm: 0.5rem;
      --radius-md: 0.75rem;
      --radius-lg: 1rem;
      --radius-xl: 1.25rem;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Ambient Background Glows */
    .ambient-glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .glow-1 {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 750px;
      height: 450px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 70%);
      filter: blur(80px);
    }
    .glow-2 {
      position: absolute;
      top: 600px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
      filter: blur(90px);
    }

    /* Layout Containers */
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
      position: relative;
      z-index: 1;
    }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }
    .flex-1 { flex: 1; }
    .w-full { width: 100%; }

    .grid { display: grid; }
    .grid-2 { grid-template-columns: 1fr; }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-4 { grid-template-columns: 1fr; }

    @media (min-width: 768px) {
      .grid-2 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(3, 1fr); }
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .grid-4 { grid-template-columns: repeat(4, 1fr); }
      .split-hero {
        display: grid;
        grid-template-columns: 1.2fr 0.9fr;
        gap: 2.5rem;
        align-items: start;
      }
    }

    /* Glass Cards */
    .glass-card {
      background: var(--bg-card);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }

    /* Navigation */
    header.navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(7, 9, 14, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 0;
    }
    .nav-links {
      display: none;
      gap: 1.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    @media (min-width: 768px) {
      .nav-links { display: flex; }
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .nav-links a:hover {
      color: #fff;
    }

    /* Brand Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      color: #fff;
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: -0.02em;
    }
    .logo-icon {
      width: 2rem;
      height: 2rem;
      background: var(--primary-gradient);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: none;
    }
    .btn-primary {
      background: var(--primary-gradient);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
    .btn-sm {
      padding: 0.4rem 0.85rem;
      font-size: 0.775rem;
      border-radius: var(--radius-sm);
    }

    /* Badges & Pills */
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
    }
    .status-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    /* Hero Typography */
    .hero-title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1.15;
      color: #fff;
      margin: 1rem 0 0.85rem;
    }
    @media (min-width: 768px) {
      .hero-title { font-size: 3.25rem; }
    }
    .text-gradient {
      background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 50%, #f472b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-sub {
      font-size: 1.05rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 600px;
    }

    /* Forms */
    .form-group {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.775rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .form-input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: #fff;
      font-size: 0.875rem;
      font-family: inherit;
      transition: all 0.15s ease;
      outline: none;
    }
    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    /* Alert Banner */
    .alert-banner {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    /* Tabs */
    .tab-bar {
      display: flex;
      padding: 0.25rem;
      background: #080b12;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 1.25rem;
      gap: 0.25rem;
    }
    .tab-btn {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    /* Progress bar */
    .progress-bar-bg {
      width: 100%;
      height: 0.5rem;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--primary-gradient);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .hidden { display: none !important; }
  </style>
</head>
<body>

  <!-- Ambient Glow Background -->
  <div class="ambient-glow">
    <div class="glow-1"></div>
    <div class="glow-2"></div>
  </div>

  <!-- Modern Navigation Bar -->
  <header class="navbar">
    <div class="container flex items-center justify-between">
      <a href="/portal" class="brand-logo">
        <div class="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <span>CodeMate</span>
      </a>

      <nav class="nav-links">
        <a href="#features">Capabilities</a>
        <a href="#pricing">Pricing</a>
        <a href="/pricing">Passes</a>
        <a href="/docs" target="_blank">Documentation</a>
      </nav>

      <div class="flex items-center gap-3" id="navAuthArea">
        <button onclick="scrollToAuth('signin')" class="btn btn-secondary btn-sm">Sign In</button>
        <button onclick="scrollToAuth('signup')" class="btn btn-primary btn-sm">Get Started</button>
      </div>
    </div>
  </header>

  <!-- Main View Area -->
  <main class="container" style="flex: 1; padding-top: 3rem; padding-bottom: 4rem;">

    <!-- ============================================================== -->
    <!-- VIEW 1: LANDING & AUTH VIEW (LOGGED OUT)                       -->
    <!-- ============================================================== -->
    <div id="landingView">
      <div class="split-hero">
        
        <!-- Left Column: Product Value & Showcase -->
        <div>
          <div class="pill">
            <span class="status-dot"></span>
            <span>Intelligent Browser Workspace</span>
          </div>

          <h1 class="hero-title">
            Write better code.<br>
            <span class="text-gradient">Solve harder problems.</span>
          </h1>

          <p class="hero-sub">
            CodeMate connects seamlessly with your browser editors and practice environments to analyze logic, generate robust multi-file architectures, and debug solutions in real time.
          </p>

          <!-- Feature Cards Grid -->
          <div class="flex flex-col gap-4" style="margin-top: 1.5rem; margin-bottom: 2rem;">
            <div class="glass-card" style="padding: 1rem 1.25rem;">
              <div class="flex items-center gap-3">
                <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; color: #a5b4fc;">
                  ⚡
                </div>
                <div>
                  <h3 style="font-size: 0.925rem; font-weight: 600; color: #fff;">Instant Algorithmic Comprehension</h3>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                    Breaks down complex problem statements, detects edge cases, and optimizes time & space complexity.
                  </p>
                </div>
              </div>
            </div>

            <div class="glass-card" style="padding: 1rem 1.25rem;">
              <div class="flex items-center gap-3">
                <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; background: rgba(139, 92, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #c084fc;">
                  🧩
                </div>
                <div>
                  <h3 style="font-size: 0.925rem; font-weight: 600; color: #fff;">Multi-File Project Synthesis</h3>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                    Synthesizes production-ready Spring Boot services, React components, and polyglot codebases cleanly.
                  </p>
                </div>
              </div>
            </div>

            <div class="glass-card" style="padding: 1rem 1.25rem;">
              <div class="flex items-center gap-3">
                <div style="width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #6ee7b7;">
                  🔒
                </div>
                <div>
                  <h3 style="font-size: 0.925rem; font-weight: 600; color: #fff;">Hardware-Bound Privacy</h3>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                    Your code remains private. Cryptographically verified sessions link directly to your Chrome extension.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Authentication Card -->
        <div id="authContainer" class="glass-card" style="padding: 2rem; border-color: rgba(99, 102, 241, 0.25); box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.7);">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <h2 id="authTitle" style="font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.02em;">Welcome to CodeMate</h2>
            <p id="authSubtitle" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.35rem;">Sign in or create your account to continue</p>
          </div>

          <!-- Auth Switcher -->
          <div class="tab-bar">
            <button id="tabSignin" class="tab-btn active" onclick="switchAuthTab('signin')">Sign In</button>
            <button id="tabSignup" class="tab-btn" onclick="switchAuthTab('signup')">Create Account</button>
          </div>

          <!-- Alert Display (with robust error parsing) -->
          <div id="authAlert" class="alert-banner hidden"></div>

          <!-- Form -->
          <form id="authForm" onsubmit="handleAuthSubmit(event)">
            <div id="nameField" class="form-group hidden">
              <label class="form-label">Full Name</label>
              <input type="text" id="inputName" placeholder="Ada Lovelace" class="form-input">
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="inputEmail" required placeholder="you@domain.com" class="form-input">
            </div>

            <div class="form-group">
              <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
                <label class="form-label" style="margin-bottom: 0;">Password</label>
                <span onclick="togglePasswordVisibility()" style="font-size: 0.725rem; color: var(--text-dim); cursor: pointer;">Show</span>
              </div>
              <input type="password" id="inputPassword" required placeholder="••••••••" class="form-input">
            </div>

            <button type="submit" id="submitBtn" class="btn btn-primary w-full" style="padding: 0.75rem; margin-top: 0.5rem;">
              Continue with Email ➔
            </button>
          </form>

          <p style="text-align: center; font-size: 0.75rem; color: var(--text-dim); margin-top: 1.25rem;">
            By continuing, you agree to CodeMate's Terms of Service and Privacy Policy.
          </p>
        </div>

      </div>

      <!-- Pricing Comparison Section -->
      <div id="pricing" style="margin-top: 6rem;">
        <div style="text-align: center; max-width: 600px; margin: 0 auto 3rem;">
          <h2 style="font-size: 2rem; font-weight: 800; color: #fff; letter-spacing: -0.03em;">Simple, transparent pricing</h2>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem;">
            Affordable daily and weekly passes. No monthly lock-ins, pay only when you code.
          </p>
        </div>

        <div class="grid grid-3 gap-6">
          <!-- Free Tier -->
          <div class="glass-card flex flex-col justify-between" style="padding: 1.75rem;">
            <div>
              <div class="flex items-center justify-between">
                <span style="font-weight: 700; color: #fff; font-size: 1.1rem;">Free Tier</span>
                <span class="pill" style="font-size: 0.7rem;">Forever</span>
              </div>
              <div style="margin: 1rem 0;">
                <span style="font-size: 2.25rem; font-weight: 800; color: #fff;">₹0</span>
              </div>
              <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Essential code analysis and manual solution generation.
              </p>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.8125rem; color: var(--text-muted);">
                <li>✓ 5 AI requests / day</li>
                <li>✓ 1 registered device</li>
                <li>✓ Problem analysis & logic</li>
                <li>✓ Manual copy-paste output</li>
              </ul>
            </div>
            <button onclick="scrollToAuth('signup')" class="btn btn-secondary w-full" style="margin-top: 1.5rem;">Get Started Free</button>
          </div>

          <!-- Core Pass (₹21/day) -->
          <div class="glass-card flex flex-col justify-between" style="padding: 1.75rem; border-color: rgba(16, 185, 129, 0.4); position: relative;">
            <div style="position: absolute; top: -0.75rem; left: 50%; transform: translateX(-50%); background: var(--success); color: #042f2e; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.75rem; border-radius: 9999px; text-transform: uppercase;">
              Most Popular
            </div>
            <div>
              <div class="flex items-center justify-between">
                <span style="font-weight: 700; color: #fff; font-size: 1.1rem;">Core Pass</span>
                <span class="pill" style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #6ee7b7;">Day Pass</span>
              </div>
              <div style="margin: 1rem 0;">
                <span style="font-size: 2.25rem; font-weight: 800; color: #fff;">₹21</span>
                <span style="font-size: 0.875rem; color: var(--text-muted);"> / day</span>
              </div>
              <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Power pass for contest rounds, problem solving, and complex optimizations.
              </p>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.8125rem; color: var(--text-muted);">
                <li>✓ <strong>25 AI requests / day</strong></li>
                <li>✓ 1 registered device</li>
                <li>✓ Optimal code generation & explanations</li>
                <li>✓ Code optimizer & bug fixer</li>
              </ul>
            </div>
            <a href="/pricing" class="btn btn-primary w-full" style="margin-top: 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">Get Core Pass ➔</a>
          </div>

          <!-- AutoPilot Pass (₹61/week) -->
          <div class="glass-card flex flex-col justify-between" style="padding: 1.75rem; border-color: rgba(99, 102, 241, 0.4);">
            <div>
              <div class="flex items-center justify-between">
                <span style="font-weight: 700; color: #fff; font-size: 1.1rem;">AutoPilot Pass</span>
                <span class="pill" style="font-size: 0.7rem;">Week Pass</span>
              </div>
              <div style="margin: 1rem 0;">
                <span style="font-size: 2.25rem; font-weight: 800; color: #fff;">₹61</span>
                <span style="font-size: 0.875rem; color: var(--text-muted);"> / week</span>
              </div>
              <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Full autonomous capabilities with 1-click editor injection.
              </p>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.8125rem; color: var(--text-muted);">
                <li>✓ <strong>100 AI requests / day</strong></li>
                <li>✓ 1-click in-editor code injection</li>
                <li>✓ Smart Practice Assistant</li>
                <li>✓ Custom BYOK (Gemini, Claude, OpenAI)</li>
              </ul>
            </div>
            <a href="/pricing" class="btn btn-primary w-full" style="margin-top: 1.5rem;">Get AutoPilot Pass ➔</a>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: LOGGED-IN SAAS DASHBOARD VIEW                          -->
    <!-- ============================================================== -->
    <div id="dashView" class="hidden">
      <!-- Profile Header Bar -->
      <div class="glass-card flex items-center justify-between" style="padding: 1.25rem 1.75rem; margin-bottom: 2rem;">
        <div class="flex items-center gap-4">
          <div id="userAvatar" style="width: 3rem; height: 3rem; border-radius: 9999px; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; color: #fff; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
            M
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="userDisplayName" style="font-size: 1.15rem; font-weight: 700; color: #fff;">Mukul Anand</h2>
              <span id="userRoleBadge" class="pill" style="font-size: 0.65rem;">USER</span>
              <span id="userVerifiedBadge" class="pill" style="font-size: 0.65rem; cursor: pointer;">✉️ Unverified [Verify Now]</span>
            </div>
            <p id="userEmailDisplay" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.15rem;">mukulanand.dev@gmail.com</p>
          </div>
        </div>

        <button onclick="handleLogout()" class="btn btn-secondary btn-sm">
          Sign Out
        </button>
      </div>

      <!-- 4-Card SaaS Metrics Grid -->
      <div class="grid grid-4 gap-6" style="margin-bottom: 2rem;">
        <!-- Card 1: AI Daily Quota -->
        <div class="glass-card flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span style="font-size: 0.775rem; font-weight: 500; color: var(--text-muted);">AI Requests Today</span>
            <span class="status-dot"></span>
          </div>
          <div style="margin: 1.25rem 0;">
            <div id="quotaMetric" style="font-size: 1.75rem; font-weight: 800; color: #fff;">0 / 5</div>
            <div class="progress-bar-bg">
              <div id="quotaBar" class="progress-bar-fill" style="width: 0%;"></div>
            </div>
          </div>
          <span style="font-size: 0.725rem; color: var(--text-dim);">Resets daily at 00:00 UTC</span>
        </div>

        <!-- Card 2: Current Subscription -->
        <div class="glass-card flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span style="font-size: 0.775rem; font-weight: 500; color: var(--text-muted);">Subscription Plan</span>
            <span class="pill" style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3);">Active</span>
          </div>
          <div style="margin: 1.25rem 0;">
            <div id="planMetric" style="font-size: 1.35rem; font-weight: 800; color: #fff;">Free Tier</div>
            <p id="planSubtext" style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.25rem;">5 requests/day • 1 device</p>
          </div>
          <a href="/pricing" class="btn btn-secondary btn-sm" style="text-align: center;">Upgrade Plan ➔</a>
        </div>

        <!-- Card 3: Registered Devices -->
        <div class="glass-card flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span style="font-size: 0.775rem; font-weight: 500; color: var(--text-muted);">Authorized Devices</span>
            <span id="deviceCount" class="pill" style="font-size: 0.65rem;">0 / 1</span>
          </div>
          <div style="margin: 1.25rem 0;">
            <div id="primaryDeviceName" style="font-size: 1.05rem; font-weight: 700; color: #fff;">No Extension Linked</div>
            <p id="primaryDeviceStatus" style="font-size: 0.775rem; color: var(--text-dim); margin-top: 0.25rem;">Paste token in extension to link</p>
          </div>
          <span style="font-size: 0.725rem; color: var(--text-dim);">Cryptographically verified</span>
        </div>

        <!-- Card 4: Platform Engine -->
        <div class="glass-card flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span style="font-size: 0.775rem; font-weight: 500; color: var(--text-muted);">Cloud Status</span>
            <span class="pill" style="font-size: 0.65rem; background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border-color: rgba(99, 102, 241, 0.3);">Connected</span>
          </div>
          <div style="margin: 1.25rem 0;">
            <div style="font-size: 1.05rem; font-weight: 700; color: #fff;">API Gateway Online</div>
            <p style="font-size: 0.775rem; color: var(--text-dim); margin-top: 0.25rem;" id="backendEndpointDisplay">Render Production</p>
          </div>
          <a href="/docs" target="_blank" class="btn btn-secondary btn-sm" style="text-align: center;">View API Docs ➔</a>
        </div>
      </div>

      <!-- Prominent Chrome Extension Session Token Card -->
      <div class="glass-card" style="padding: 1.75rem; margin-bottom: 2rem; border-color: rgba(99, 102, 241, 0.3); background: rgba(14, 19, 31, 0.9);">
        <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <div class="flex items-center gap-2">
              <span style="font-size: 1.25rem;">🔑</span>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: #fff;">Link CodeMate Chrome Extension</h3>
            </div>
            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem;">
              Copy your secure session token below and paste it into the CodeMate extension sidepanel to log in instantly without passwords:
            </p>
          </div>
          <button onclick="copyToken()" id="copyTokenBtn" class="btn btn-primary btn-sm">
            📋 Copy Session Token
          </button>
        </div>

        <input type="text" id="tokenDisplay" readonly class="form-input" style="font-family: 'JetBrains Mono', monospace; font-size: 0.775rem; color: #a5b4fc; background: #060910; cursor: pointer;" onclick="copyToken()" />

        <!-- 3-Step Setup Helper -->
        <div class="grid grid-3 gap-4" style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border);">
          <div style="font-size: 0.775rem; color: var(--text-muted);">
            <strong style="color: #fff; display: block; margin-bottom: 0.25rem;">1. Copy Token</strong>
            Click the Copy button above to copy your session key.
          </div>
          <div style="font-size: 0.775rem; color: var(--text-muted);">
            <strong style="color: #fff; display: block; margin-bottom: 0.25rem;">2. Open Extension</strong>
            Open CodeMate in Chrome & select the <strong>[Paste Token]</strong> tab.
          </div>
          <div style="font-size: 0.775rem; color: var(--text-muted);">
            <strong style="color: #fff; display: block; margin-bottom: 0.25rem;">3. Connect</strong>
            Click <strong>Link Extension</strong> to immediately sync your session.
          </div>
        </div>
      </div>

      <!-- Feature Requests & Feedback -->
      <div class="glass-card" style="padding: 1.75rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">💡 Submit Feedback or Feature Request</h3>
        <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Have an idea or need support for a specific coding platform? Let our engineering team know directly.
        </p>

        <form onsubmit="handleFeatureRequest(event)" class="flex flex-col gap-3">
          <input type="text" id="frTitle" required placeholder="Short summary of request..." class="form-input">
          <textarea id="frDesc" rows="3" required placeholder="Describe what you would like to see in CodeMate..." class="form-input" style="resize: vertical;"></textarea>
          <button type="submit" class="btn btn-primary" style="align-self: flex-start;">
            Send Feedback
          </button>
        </form>
      </div>
    </div>

  </main>

  <!-- Clean Minimal Footer -->
  <footer style="border-top: 1px solid var(--border); padding: 1.5rem 0; background: rgba(7, 9, 14, 0.6); font-size: 0.8rem; color: var(--text-dim);">
    <div class="container flex items-center justify-between" style="flex-wrap: wrap; gap: 1rem;">
      <div class="flex items-center gap-2">
        <span style="font-weight: 600; color: var(--text-muted);">CodeMate</span>
        <span>•</span>
        <span>The Intelligent Coding Workspace</span>
      </div>
      <div class="flex items-center gap-4">
        <a href="/pricing" style="color: var(--text-muted); text-decoration: none;">Pricing</a>
        <a href="/docs" target="_blank" style="color: var(--text-muted); text-decoration: none;">API</a>
        <span>© 2026 CodeMate Inc.</span>
      </div>
    </div>
  </footer>

  <!-- Client-Side SaaS Orchestration Logic -->
  <script>
    let currentAuthMode = 'signin';
    let cachedToken = null;

    // Robust error message parser: handles string, dictionary, or array
    function parseErrorMessage(data, fallback = 'Authentication failed. Please check credentials.') {
      if (!data) return fallback;
      if (typeof data.detail === 'string') return data.detail;
      if (data.detail && typeof data.detail === 'object') {
        return data.detail.detail || data.detail.message || data.detail.code || JSON.stringify(data.detail);
      }
      if (typeof data.message === 'string') return data.message;
      return fallback;
    }

    document.addEventListener('DOMContentLoaded', () => {
      const endpointEl = document.getElementById('backendEndpointDisplay');
      if (endpointEl) endpointEl.textContent = window.location.origin;

      const savedToken = localStorage.getItem('codemate_web_token');
      if (savedToken) {
        cachedToken = savedToken;
        loadProfile(savedToken);
      } else {
        showLandingView();
      }
    });

    function scrollToAuth(mode) {
      switchAuthTab(mode);
      const el = document.getElementById('authContainer');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
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
        authTitle.textContent = 'Create your account';
        submitBtn.textContent = 'Create Free Account ➔';
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
      } else {
        nameField.classList.add('hidden');
        authTitle.textContent = 'Welcome to CodeMate';
        submitBtn.textContent = 'Sign In to CodeMate ➔';
        tabSignin.classList.add('active');
        tabSignup.classList.remove('active');
      }
    }

    function togglePasswordVisibility() {
      const input = document.getElementById('inputPassword');
      input.type = input.type === 'password' ? 'text' : 'password';
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
        : { email, password, device_id: 'web_portal', device_name: 'Web Dashboard', browser_name: 'Web Portal' };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(parseErrorMessage(data));
        }

        const token = data.access_token || data.tokens?.access_token;
        if (token) {
          localStorage.setItem('codemate_web_token', token);
          cachedToken = token;
          loadProfile(token);
        } else if (currentAuthMode === 'signup') {
          showAlert('Account created successfully! Please sign in.', false);
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
        document.getElementById('userRoleBadge').textContent = role;

        const verifiedEl = document.getElementById('userVerifiedBadge');
        if (user.email_verified) {
          verifiedEl.textContent = '✓ Verified';
          verifiedEl.style.color = '#6ee7b7';
          verifiedEl.onclick = null;
          verifiedEl.style.cursor = 'default';
        } else {
          verifiedEl.innerHTML = '✉️ Unverified <span style="text-decoration: underline; font-weight: 700; margin-left: 0.25rem;">[Verify Now]</span>';
          verifiedEl.style.cursor = 'pointer';
          verifiedEl.onclick = async () => {
            try {
              verifiedEl.textContent = 'Verifying...';
              const vRes = await fetch('/api/auth/verify-self', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const vData = await vRes.json();
              if (vRes.ok) {
                alert('✓ ' + (vData.message || 'Email verified successfully!'));
                loadProfile(token);
              } else {
                alert('Verification: ' + parseErrorMessage(vData));
                loadProfile(token);
              }
            } catch (err) {
              alert('Verification error: ' + err.message);
              loadProfile(token);
            }
          };
        }

        document.getElementById('tokenDisplay').value = token;

        // Fetch subscription quota details
        try {
          const subRes = await fetch('/api/subscription/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (subRes.ok) {
            const sub = await subRes.json();
            document.getElementById('planMetric').textContent = sub.plan_name || 'Free Tier';
            document.getElementById('planSubtext').textContent = `${sub.ai_usage_limit || 5} req/day • ${sub.device_limit || 1} registered device(s)`;
            document.getElementById('quotaMetric').textContent = `${sub.ai_requests_today || 0} / ${sub.ai_usage_limit || 5}`;
            const pct = Math.min(100, Math.round(((sub.ai_requests_today || 0) / (sub.ai_usage_limit || 5)) * 100));
            document.getElementById('quotaBar').style.width = `${pct}%`;

            // Fetch device details
            try {
              const devRes = await fetch('/api/auth/devices', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (devRes.ok) {
                const devs = await devRes.json();
                const activeDevs = (devs || []).filter(d => d.device_status === 'active' && !d.device_id.includes('web'));
                document.getElementById('deviceCount').textContent = `${activeDevs.length} / ${sub.device_limit || 1}`;
                if (activeDevs.length > 0) {
                  document.getElementById('primaryDeviceName').textContent = activeDevs[0].device_name || 'Chrome Extension';
                  document.getElementById('primaryDeviceStatus').textContent = 'Primary Session Active';
                } else {
                  document.getElementById('primaryDeviceName').textContent = 'No Extension Linked';
                  document.getElementById('primaryDeviceStatus').textContent = 'Paste token into extension to link';
                }
              }
            } catch {}
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
        <button onclick="handleLogout()" class="btn btn-secondary btn-sm">
          Sign Out
        </button>
      `;
    }

    function showLandingView() {
      document.getElementById('landingView').classList.remove('hidden');
      document.getElementById('dashView').classList.add('hidden');
      document.getElementById('navAuthArea').innerHTML = `
        <button onclick="scrollToAuth('signin')" class="btn btn-secondary btn-sm">Sign In</button>
        <button onclick="scrollToAuth('signup')" class="btn btn-primary btn-sm">Get Started</button>
      `;
    }

    function showAlert(msg, isError) {
      const el = document.getElementById('authAlert');
      el.textContent = msg;
      el.className = isError ? 'alert-banner alert-error' : 'alert-banner alert-success';
    }

    function hideAlert() {
      document.getElementById('authAlert').className = 'alert-banner hidden';
    }

    function copyToken() {
      const input = document.getElementById('tokenDisplay');
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('copyTokenBtn');
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2500);
      alert('✓ Session Token copied to clipboard!\n\nNext step: Open your CodeMate Chrome extension, switch to the "Paste Token" tab, and click "Link Extension with Token" to log in.');
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
          alert('✓ Thank you! Your feedback has been registered.');
          document.getElementById('frTitle').value = '';
          document.getElementById('frDesc').value = '';
        } else {
          alert('Could not submit request. Please try again.');
        }
      } catch {
        alert('Feedback submitted.');
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
  <!-- Pure CSS Embedded -->
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
  <!-- Pure CSS Embedded -->
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

