/**
 * CodeMate AI — Expandable Floating Launcher & 1-Click Auto Solve Widget
 * 
 * Floats unobtrusively on CodeChef practice pages.
 * - Collapsed state: Elegant glowing badge. Clicking directly opens the CodeMate companion panel.
 * - Hover state: Smoothly extends horizontally revealing [ ⚡ 1-Click Solve & Run ] and [ 🤖 CodeMate ].
 * - Draggable: Position can be moved anywhere on screen and persists across refreshes.
 * - Non-overlapping: Positioned comfortably at bottom: 110px; right: 28px; so it never blocks footer buttons.
 */

import { PageDetector } from './page-detector';
import { normalizeLanguage } from '../utils/language';
import { StorageService } from '../services/storage';

export class FloatingLauncher {
  private static readonly CONTAINER_ID = 'codemate-floating-launcher';
  private static isBusy = false;
  private static collapseTimeout: ReturnType<typeof setTimeout> | null = null;
  private static currentProvider = 'gemini';
  private static currentToken: string | null = null;
  private static currentUser: any = null;
  private static currentSubscription: any = null;

  public static getCurrentProvider(): string {
    return this.currentProvider;
  }

  public static async syncAuthState(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    try {
      const st = await new Promise<any>((resolve) => {
        chrome.storage.local.get([
          'codemate_auth_tokens_v1',
          'codemate_auth_tokens',
          'codemate_user_v1',
          'codemate_subscription_v1',
        ], resolve);
      });
      this.currentToken = st?.codemate_auth_tokens_v1?.access_token || st?.codemate_auth_tokens?.access_token || null;
      this.currentUser = st?.codemate_user_v1 || null;
      this.currentSubscription = st?.codemate_subscription_v1 || null;
      this.updateLauncherUI();
    } catch (e) {
      console.warn('[CodeMate AI] syncAuthState error:', e);
    }
  }

  public static updateLauncherUI(): void {
    const container = document.getElementById(this.CONTAINER_ID);
    if (!container) return;

    const solveBtn = container.querySelector('.cm-btn-solve') as HTMLButtonElement | null;
    const textSpan = container.querySelector('.cm-solve-text') as HTMLElement | null;
    if (!solveBtn || !textSpan || this.isBusy) return;

    const role = (this.currentUser?.role || '').toUpperCase();
    const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT_AGENT'].includes(role);
    const planId = (this.currentSubscription?.plan_id || '').toUpperCase();
    const entitlements: string[] = this.currentSubscription?.entitlements || [];
    const hasAutopilot = isPrivileged || planId === 'PLAN_AUTOPILOT_PASS' || entitlements.includes('one_click_insert') || entitlements.includes('autopilot');

    if (!this.currentToken) {
      textSpan.textContent = 'Sign In to Solve';
      solveBtn.title = 'Click to open CodeMate and sign in to access autonomous problem solving';
      solveBtn.style.background = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
    } else if (this.currentUser?.email_verified === false) {
      textSpan.textContent = 'Verify Email';
      solveBtn.title = 'Please verify your email address to unlock AI solving';
      solveBtn.style.background = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
    } else {
      textSpan.textContent = 'Auto-Pilot Solve';
      solveBtn.title = hasAutopilot
        ? '1-Click Auto Solve: Complete code, insert, run, submit, and next'
        : 'Auto-Pilot Solve (AutoPilot Pass required for direct editor insertion)';
      this.applyTheme(this.currentProvider);
    }
  }

  /**
   * World-class designer floating toast notification injected into the host page.
   * Features hairline glassmorphic border, ambient glow, backdrop-blur, SVG iconography,
   * and smooth enter/exit animations.
   */
  public static showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const TOAST_ID = 'cm-designer-toast';
    const existing = document.getElementById(TOAST_ID);
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = TOAST_ID;

    let borderColor = 'rgba(99, 102, 241, 0.4)';
    let shadowColor = 'rgba(99, 102, 241, 0.25)';
    let iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

    if (type === 'warning') {
      borderColor = 'rgba(245, 158, 11, 0.45)';
      shadowColor = 'rgba(245, 158, 11, 0.25)';
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'error') {
      borderColor = 'rgba(244, 63, 94, 0.5)';
      shadowColor = 'rgba(244, 63, 94, 0.3)';
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'success') {
      borderColor = 'rgba(16, 185, 129, 0.45)';
      shadowColor = 'rgba(16, 185, 129, 0.25)';
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    }

    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        max-width: 440px;
        width: max-content;
        min-width: 280px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid ${borderColor};
        box-shadow: 0 20px 45px -10px rgba(0,0,0,0.8), 0 0 20px ${shadowColor};
        border-radius: 12px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f1f5f9;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
        animation: cm-toast-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: auto;
      ">
        <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
        <div style="flex: 1; word-break: break-word;">${message}</div>
        <button id="cm-toast-dismiss" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
          border-radius: 4px;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    const dismissBtn = toast.querySelector('#cm-toast-dismiss');
    dismissBtn?.addEventListener('click', () => toast.remove());

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 4500);
  }

  /**
   * Chromatic dynamic theme palettes mapped to AI providers.
   * Features Gemini's signature flowing aurora / chromatic shimmer.
   */
  public static getThemeForProvider(provider: string) {
    const p = (provider || '').toLowerCase();
    if (p.includes('gemini')) {
      return {
        provider: 'gemini',
        name: 'Google Gemini',
        // Signature Google Chromatic Flow: Google Blue, Purple, Coral Warm Pink, Sky Cyan
        gradient: 'linear-gradient(135deg, #4285F4 0%, #9b72cb 25%, #d96570 50%, #1ba1e2 75%, #4285F4 100%)',
        badgeGradient: 'linear-gradient(135deg, #4285F4 0%, #9b72cb 35%, #d96570 70%, #1ba1e2 100%)',
        glow: 'rgba(66, 133, 244, 0.45)',
        border: 'rgba(155, 114, 203, 0.65)',
        brightGlow: 'rgba(155, 114, 203, 0.65)',
        hoverBorder: 'rgba(66, 133, 244, 0.85)',
      };
    }
    if (p.includes('openai')) {
      return {
        provider: 'openai',
        name: 'OpenAI',
        // Emerald Neon & Cyber Mint
        gradient: 'linear-gradient(135deg, #10a37f 0%, #059669 25%, #00e5a3 50%, #1a7f64 75%, #10a37f 100%)',
        badgeGradient: 'linear-gradient(135deg, #10a37f 0%, #00e5a3 100%)',
        glow: 'rgba(16, 163, 127, 0.45)',
        border: 'rgba(16, 163, 127, 0.65)',
        brightGlow: 'rgba(0, 229, 163, 0.65)',
        hoverBorder: 'rgba(0, 229, 163, 0.85)',
      };
    }
    if (p.includes('anthropic') || p.includes('claude')) {
      return {
        provider: 'anthropic',
        name: 'Claude',
        // Sunset Terracotta & Warm Amber
        gradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 25%, #f97316 50%, #b45309 75%, #d97706 100%)',
        badgeGradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
        glow: 'rgba(234, 88, 12, 0.45)',
        border: 'rgba(234, 88, 12, 0.65)',
        brightGlow: 'rgba(249, 115, 22, 0.65)',
        hoverBorder: 'rgba(249, 115, 22, 0.85)',
      };
    }
    if (p.includes('xai') || p.includes('grok')) {
      return {
        provider: 'xai',
        name: 'Grok',
        // Obsidian & Electric Violet-Magenta
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 30%, #3b82f6 65%, #a855f7 100%)',
        badgeGradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        glow: 'rgba(236, 72, 153, 0.45)',
        border: 'rgba(236, 72, 153, 0.65)',
        brightGlow: 'rgba(139, 92, 246, 0.65)',
        hoverBorder: 'rgba(236, 72, 153, 0.85)',
      };
    }
    if (p.includes('openrouter') || p.includes('deepseek')) {
      return {
        provider: 'openrouter',
        name: 'OpenRouter / DeepSeek',
        // Electric Cyan & Cobalt Flow
        gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 25%, #06b6d4 50%, #60a5fa 75%, #1d4ed8 100%)',
        badgeGradient: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)',
        glow: 'rgba(59, 130, 246, 0.45)',
        border: 'rgba(59, 130, 246, 0.65)',
        brightGlow: 'rgba(6, 182, 212, 0.65)',
        hoverBorder: 'rgba(6, 182, 212, 0.85)',
      };
    }
    return {
      provider: 'default',
      name: 'CodeMate AI',
      // Emerald Dev & Purple Accent
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #a855f7 65%, #6366f1 100%)',
      badgeGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      glow: 'rgba(99, 102, 241, 0.45)',
      border: 'rgba(168, 85, 247, 0.65)',
      brightGlow: 'rgba(168, 85, 247, 0.65)',
      hoverBorder: 'rgba(168, 85, 247, 0.85)',
    };
  }

  /**
   * Applies model-adaptive flowing gradient and glow to the widget
   */
  public static applyTheme(provider: string): void {
    this.currentProvider = provider;
    const theme = this.getThemeForProvider(provider);
    const container = document.getElementById(this.CONTAINER_ID);
    if (!container) return;

    container.style.setProperty('--cm-theme-glow', theme.glow);
    container.style.setProperty('--cm-theme-bright', theme.brightGlow);
    container.style.borderColor = theme.border;
    container.style.boxShadow = `0 4px 20px rgba(0, 0, 0, 0.45), 0 0 16px ${theme.glow}`;

    const iconAnchor = container.querySelector('.cm-icon-anchor') as HTMLElement | null;
    if (iconAnchor) {
      iconAnchor.style.background = theme.badgeGradient;
      iconAnchor.classList.add('cm-flowing-gradient');
    }

    const solveBtn = container.querySelector('.cm-btn-solve') as HTMLElement | null;
    if (solveBtn) {
      solveBtn.style.background = theme.gradient;
      solveBtn.style.boxShadow = `0 2px 10px ${theme.glow}`;
      solveBtn.classList.add('cm-flowing-gradient');
    }
  }

  public static inject(): void {
    if (document.getElementById(this.CONTAINER_ID)) return;

    // Inject CSS keyframes for Google Gemini rotating border gradient
    if (!document.getElementById('codemate-floating-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'codemate-floating-styles';
      styleEl.textContent = `
        @property --gemini-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes gemini-border-spin {
          0% { --gemini-angle: 0deg; }
          100% { --gemini-angle: 360deg; }
        }
        @keyframes cm-sparkle-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.25); }
        }
        #codemate-floating-launcher {
          position: fixed;
          z-index: 999999;
          height: 48px;
          width: 48px;
          border-radius: 24px;
          background: rgba(10, 15, 29, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(66, 133, 244, 0.3);
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #codemate-floating-launcher::before {
          content: '';
          position: absolute;
          inset: -1.5px;
          border-radius: inherit;
          padding: 1.5px;
          background: conic-gradient(from var(--gemini-angle, 0deg), #4285F4 0%, #9B72CB 35%, #ec588e 70%, #4285F4 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: gemini-border-spin 3s linear infinite;
        }
        #codemate-floating-launcher:hover {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(155, 114, 203, 0.35);
        }
      `;
      document.head.appendChild(styleEl);
    }

    const container = document.createElement('div');
    container.id = this.CONTAINER_ID;
    container.setAttribute('aria-label', 'CodeMate AI Smart Assistant');
    container.dataset.state = 'collapsed';
    container.dataset.side = 'right';

    // Retrieve saved position from localStorage if available
    let savedPos: { top?: string; bottom?: string; side?: 'left' | 'right'; offset?: string } | null = null;
    try {
      const raw = localStorage.getItem('codemate_floating_pos_v2');
      if (raw) savedPos = JSON.parse(raw);
    } catch {}

    const isLeft = savedPos?.side === 'left';
    container.dataset.side = isLeft ? 'left' : 'right';

    if (isLeft) {
      container.style.left = savedPos?.offset || '28px';
      container.style.right = 'auto';
    } else {
      container.style.right = savedPos?.offset || '28px';
      container.style.left = 'auto';
    }

    if (savedPos?.top) {
      container.style.top = savedPos.top;
      container.style.bottom = 'auto';
    } else {
      container.style.bottom = savedPos?.bottom || '110px';
      container.style.top = 'auto';
    }

    // Direction-aware alignment: icon at the pinned screen edge
    container.style.justifyContent = isLeft ? 'flex-start' : 'flex-end';
    container.style.flexDirection = isLeft ? 'row-reverse' : 'row';

    // Collapsed Icon Anchor (always pinned at the screen edge)
    const iconAnchor = document.createElement('div');
    iconAnchor.className = 'cm-icon-anchor';
    iconAnchor.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285F4 0%, #7c3aed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin: 2px;
      z-index: 2;
      transition: transform 0.25s ease;
      box-shadow: 0 0 12px rgba(66, 133, 244, 0.35);
    `;
    iconAnchor.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    `;

    // Expanded Content Wrapper
    const expandedContent = document.createElement('div');
    expandedContent.className = 'cm-expanded-content';
    expandedContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease 0.05s;
      white-space: nowrap;
      flex: 1;
      z-index: 2;
    `;

    // 1-Click Smart Auto Solve & Run Button
    const solveBtn = document.createElement('button');
    solveBtn.className = 'cm-btn-solve';
    solveBtn.title = '1-Click Auto Solve: Complete code, insert, run, submit, and next';
    solveBtn.style.cssText = `
      background: linear-gradient(135deg, #4285F4 0%, #9B72CB 100%);
      color: #ffffff;
      border: none;
      border-radius: 14px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(66, 133, 244, 0.4);
      transition: all 0.2s ease;
      outline: none;
    `;
    solveBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span class="cm-solve-text">Auto-Pilot Solve</span>
    `;

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.2);
    `;

    // Open Companion Side Panel Button
    const companionBtn = document.createElement('button');
    companionBtn.className = 'cm-btn-companion';
    companionBtn.title = 'Open CodeMate AI Companion Panel';
    companionBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    `;
    companionBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8"/>
        <path d="M12 8v8"/>
      </svg>
      <span>Panel</span>
    `;

    // Minimize to edge button (Linear/Arc pattern)
    const minBtn = document.createElement('button');
    minBtn.className = 'cm-btn-minimize';
    minBtn.title = 'Dock CodeMate to screen edge';
    minBtn.style.cssText = `
      background: transparent;
      color: #94a3b8;
      border: none;
      padding: 4px;
      margin-left: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: color 0.15s ease, background 0.15s ease;
      outline: none;
    `;
    minBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    minBtn.addEventListener('mouseenter', () => {
      minBtn.style.color = '#ffffff';
      minBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    minBtn.addEventListener('mouseleave', () => {
      minBtn.style.color = '#94a3b8';
      minBtn.style.background = 'transparent';
    });

    // Assemble elements
    expandedContent.appendChild(solveBtn);
    expandedContent.appendChild(divider);
    expandedContent.appendChild(companionBtn);
    expandedContent.appendChild(minBtn);

    container.appendChild(expandedContent);
    container.appendChild(iconAnchor);

    // Edge Tab for minimized state
    const minTab = document.createElement('div');
    minTab.id = 'codemate-min-tab';
    minTab.title = 'Click to show CodeMate AI Assistant';
    minTab.style.cssText = `
      position: fixed;
      width: 12px;
      height: 48px;
      background: linear-gradient(135deg, #4285F4 0%, #7c3aed 100%);
      border-radius: ${isLeft ? '0 8px 8px 0' : '8px 0 0 8px'};
      ${isLeft ? 'left: 0;' : 'right: 0;'}
      top: ${savedPos?.top || 'auto'};
      ${savedPos?.top ? '' : 'bottom: 110px;'}
      z-index: 999998;
      cursor: pointer;
      display: ${localStorage.getItem('codemate_floating_minimized') === 'true' ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(66, 133, 244, 0.4);
      transition: all 0.2s ease;
    `;
    minTab.innerHTML = `
      <div style="width: 3px; height: 16px; border-radius: 2px; background: rgba(255,255,255,0.85);"></div>
    `;

    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.style.display = 'none';
      minTab.style.display = 'flex';
      try {
        localStorage.setItem('codemate_floating_minimized', 'true');
      } catch {}
    });

    minTab.addEventListener('click', () => {
      minTab.style.display = 'none';
      container.style.display = 'flex';
      try {
        localStorage.setItem('codemate_floating_minimized', 'false');
      } catch {}
    });

    if (localStorage.getItem('codemate_floating_minimized') === 'true') {
      container.style.display = 'none';
    }

    // Expand on hover
    const expandWidget = () => {
      if (this.collapseTimeout) {
        clearTimeout(this.collapseTimeout);
        this.collapseTimeout = null;
      }
      container.dataset.state = 'expanded';
      const targetWidth = Math.min(320, window.innerWidth - 32);
      container.style.width = `${targetWidth}px`;
      expandedContent.style.opacity = '1';
      expandedContent.style.pointerEvents = 'auto';
    };

    // Collapse on mouseleave (debounced)
    const collapseWidget = () => {
      if (this.isBusy) return;
      if (this.collapseTimeout) clearTimeout(this.collapseTimeout);
      this.collapseTimeout = setTimeout(() => {
        container.dataset.state = 'collapsed';
        container.style.width = '48px';
        expandedContent.style.opacity = '0';
        expandedContent.style.pointerEvents = 'none';
      }, 200);
    };

    container.addEventListener('mouseenter', expandWidget);
    container.addEventListener('mouseleave', collapseWidget);

    // Button Hover Effects
    solveBtn.addEventListener('mouseenter', () => {
      solveBtn.style.transform = 'scale(1.03)';
      solveBtn.style.filter = 'brightness(1.15)';
    });
    solveBtn.addEventListener('mouseleave', () => {
      solveBtn.style.transform = 'scale(1)';
      solveBtn.style.filter = 'brightness(1)';
    });

    companionBtn.addEventListener('mouseenter', () => {
      companionBtn.style.color = '#ffffff';
      companionBtn.style.background = 'rgba(255, 255, 255, 0.12)';
    });
    companionBtn.addEventListener('mouseleave', () => {
      companionBtn.style.color = '#e2e8f0';
      companionBtn.style.background = 'rgba(255, 255, 255, 0.06)';
    });

    // Companion click handler
    const openCompanion = () => {
      try {
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (_res) => {
            if (chrome.runtime.lastError) {
              console.log('[CodeMate AI] Side panel trigger response:', chrome.runtime.lastError.message);
            }
          });
        }
      } catch (err) {
        console.warn('[CodeMate AI] Error opening companion:', err);
      }
    };

    companionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCompanion();
    });

    // 1-Click Auto Solve Handler
    solveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (this.isBusy) return;

      await this.syncAuthState();

      if (!this.currentToken) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        return;
      }

      if (this.currentUser?.email_verified === false) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        return;
      }

      const role = (this.currentUser?.role || '').toUpperCase();
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT_AGENT'].includes(role);
      const planId = (this.currentSubscription?.plan_id || '').toUpperCase();
      const entitlements: string[] = this.currentSubscription?.entitlements || [];
      const hasAutopilot = isPrivileged || planId === 'PLAN_AUTOPILOT_PASS' || entitlements.includes('one_click_insert') || entitlements.includes('autopilot');

      if (!hasAutopilot) {
        FloatingLauncher.showToast('🔒 AutoPilot Pass Required (₹61/week) for 1-Click editor injection. Opening companion panel...', 'warning');
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        return;
      }

      await this.execute1ClickSolve(solveBtn, container, collapseWidget);
    });

    // Drag & Click Logic for iconAnchor and container with Adaptive Edge Pinning
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let dragDistance = 0;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      isDragging = true;
      dragDistance = 0;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      const abortCtrl = new AbortController();

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        dragDistance = Math.hypot(dx, dy);

        if (dragDistance > 5) {
          container.style.transition = 'none';
          container.style.bottom = 'auto';
          container.style.right = 'auto';
          container.style.left = `${Math.max(8, Math.min(window.innerWidth - 56, initialLeft + dx))}px`;
          container.style.top = `${Math.max(8, Math.min(window.innerHeight - 56, initialTop + dy))}px`;
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        container.style.transition = 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease';
        abortCtrl.abort();

        if (dragDistance > 5) {
          const rect = container.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const isRightSide = centerX >= window.innerWidth / 2;

          if (isRightSide) {
            const rightOffset = Math.max(10, window.innerWidth - rect.right);
            container.style.right = `${rightOffset}px`;
            container.style.left = 'auto';
            container.dataset.side = 'right';
            container.style.justifyContent = 'flex-end';
            container.style.flexDirection = 'row';
            minTab.style.right = '0';
            minTab.style.left = 'auto';
            minTab.style.borderRadius = '8px 0 0 8px';
            minTab.style.top = `${rect.top}px`;

            try {
              localStorage.setItem(
                'codemate_floating_pos_v2',
                JSON.stringify({ side: 'right', offset: `${rightOffset}px`, top: `${rect.top}px` })
              );
            } catch {}
          } else {
            const leftOffset = Math.max(10, rect.left);
            container.style.left = `${leftOffset}px`;
            container.style.right = 'auto';
            container.dataset.side = 'left';
            container.style.justifyContent = 'flex-start';
            container.style.flexDirection = 'row-reverse';
            minTab.style.left = '0';
            minTab.style.right = 'auto';
            minTab.style.borderRadius = '0 8px 8px 0';
            minTab.style.top = `${rect.top}px`;

            try {
              localStorage.setItem(
                'codemate_floating_pos_v2',
                JSON.stringify({ side: 'left', offset: `${leftOffset}px`, top: `${rect.top}px` })
              );
            } catch {}
          }
        } else {
          if (container.dataset.state === 'collapsed') {
            openCompanion();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove, { signal: abortCtrl.signal });
      window.addEventListener('mouseup', onMouseUp, { signal: abortCtrl.signal });
      window.addEventListener('blur', () => { abortCtrl.abort(); isDragging = false; }, { signal: abortCtrl.signal });
    };

    container.addEventListener('mousedown', onMouseDown);

    document.body.appendChild(container);
    document.body.appendChild(minTab);

    // Apply active provider theme and initial auth state
    StorageService.getSettings().then((settings) => {
      FloatingLauncher.applyTheme(settings.activeProvider || 'gemini');
    }).catch(() => {
      FloatingLauncher.applyTheme('gemini');
    });

    FloatingLauncher.syncAuthState();

    // Listen for real-time model/provider and auth/plan changes
    try {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local') {
            if (changes.codemate_settings) {
              const newSettings = changes.codemate_settings.newValue;
              if (newSettings?.activeProvider) {
                FloatingLauncher.applyTheme(newSettings.activeProvider);
              }
            }
            if (
              changes.codemate_auth_tokens_v1 ||
              changes.codemate_auth_tokens ||
              changes.codemate_user_v1 ||
              changes.codemate_subscription_v1
            ) {
              FloatingLauncher.syncAuthState();
            }
          }
        });
      }
    } catch {}
  }

  /**
   * Executes the full 1-Click Auto Solve & Run pipeline
   */
  private static async execute1ClickSolve(
    solveBtn: HTMLButtonElement,
    container: HTMLElement,
    onFinishCollapse: () => void
  ): Promise<void> {
    this.isBusy = true;
    container.style.width = '335px';
    const textSpan = solveBtn.querySelector('.cm-solve-text') as HTMLElement;

    const setStatus = (msg: string, bg = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)') => {
      if (textSpan) textSpan.textContent = msg;
      solveBtn.style.background = bg;
    };

    try {
      // 0. Mandatory Authentication & Verification Check
      const authState = await new Promise<{ token?: string; user?: any }>((res) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['codemate_auth_tokens_v1', 'codemate_auth_tokens', 'codemate_user_v1'], (st) => {
            const token = st.codemate_auth_tokens_v1?.access_token || st.codemate_auth_tokens?.access_token;
            res({ token, user: st.codemate_user_v1 });
          });
        } else {
          res({});
        }
      });

      if (!authState.token) {
        setStatus('🔒 Sign In to Solve', 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)');
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        setTimeout(() => {
          this.isBusy = false;
          setStatus('Auto-Pilot Solve');
          onFinishCollapse();
        }, 3000);
        return;
      }

      if (authState.user && authState.user.email_verified === false) {
        setStatus('✉️ Verify Email', 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)');
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        setTimeout(() => {
          this.isBusy = false;
          setStatus('Auto-Pilot Solve');
          onFinishCollapse();
        }, 3000);
        return;
      }

      const role = (authState.user?.role || '').toUpperCase();
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT_AGENT'].includes(role);
      const sub = await new Promise<any>((res) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['codemate_subscription_v1'], (st) => res(st.codemate_subscription_v1));
        } else {
          res(null);
        }
      });
      const planId = (sub?.plan_id || '').toUpperCase();
      const entitlements: string[] = sub?.entitlements || [];
      const hasAutopilot = isPrivileged || planId === 'PLAN_AUTOPILOT_PASS' || entitlements.includes('one_click_insert') || entitlements.includes('autopilot');

      if (!hasAutopilot) {
        FloatingLauncher.showToast('🔒 AutoPilot Pass Required (₹61/week) for 1-Click editor injection. Opening companion panel...', 'warning');
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
        this.isBusy = false;
        this.updateLauncherUI();
        onFinishCollapse();
        return;
      }

      setStatus('Analyzing...');

      // 1. Extract Problem Context from DOM
      const problem = PageDetector.getProblemContext();
      if (!problem) {
        throw new Error('Problem statement not detected');
      }

      const settings = await StorageService.getSettings();
      const activeProvider = settings.activeProvider || 'gemini';
      const activeModel = settings.selectedModel || undefined;
      const apiKey = settings.aiMode === 'byok' ? settings.byokVault[activeProvider.toLowerCase()] : undefined;

      // Check if multi-file Monaco/Code-OSS workbench or single-file editor
      const isMultiFile = !!(
        document.querySelector('.monaco-workbench') ||
        document.querySelector('.tabs-container .tab') ||
        document.querySelector('.monaco-editor')
      );

      if (isMultiFile) {
        setStatus('Reading Files...');
        let harvestedFiles: Record<string, string> = {};
        try {
          harvestedFiles = await this.harvestWorkspaceFiles();
        } catch (e) {
          console.warn('[CodeMate AI] harvestWorkspaceFiles warning:', e);
        }

        // If no files harvested via tabs, query active editor with accurate active filename
        if (Object.keys(harvestedFiles).length === 0) {
          try {
            const editorCodeRes = await this.queryEditorCode();
            if (editorCodeRes && editorCodeRes.code) {
              const activeTabEl = document.querySelector('.tabs-container .tab.active, .tabs-container .tab[aria-selected="true"]');
              const activeLabelEl = activeTabEl?.querySelector('.label-name, .tab-label') as HTMLElement | null;
              const breadcrumbItems = Array.from(document.querySelectorAll('.monaco-breadcrumb-item, .breadcrumbs-container .monaco-breadcrumb-item'));
              const lastBreadcrumb = breadcrumbItems.pop() as HTMLElement | null;

              const detectedName =
                activeLabelEl?.innerText?.trim() ||
                activeTabEl?.getAttribute('aria-label')?.split(',')[0]?.trim() ||
                lastBreadcrumb?.innerText?.trim() ||
                'main';
              const cleanFileName = detectedName.replace(/[\u00d7\u2715\u2716\u2a09x]\s*$/i, '').trim();
              harvestedFiles[cleanFileName] = editorCodeRes.code;
            }
          } catch {
            // ignore
          }
        }

        const lang = normalizeLanguage(problem.language || 'java');

        // Multi-File Project: Progressive File Solving (EPC-PFS Architecture)
        if (Object.keys(harvestedFiles).length >= 2) {
          setStatus('Architecting Project...');

          // Stage 1: Ephemeral Blueprint Request
          const blueprintReq = {
            problem_title: problem.problemTitle || problem.problemCode || 'Project Task',
            problem_statement: problem.problemStatement || 'Implement the project components according to instructions.',
            constraints: problem.constraints || '',
            selected_language: lang,
            workspace_files: harvestedFiles,
            files: harvestedFiles,
          };

          const blueprintRes = await new Promise<{
            success: boolean;
            data?: {
              project_id: string;
              framework: string;
              execution_plan: Array<{
                step: number;
                filename: string;
                action: 'MODIFY' | 'READ_ONLY_PROTECT' | 'CREATE';
                role: string;
                reason: string;
              }>;
            };
            error?: string;
          }>((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'SECURE_FORWARD_API',
                endpoint: '/api/projects/ephemeral/blueprint',
                payload: blueprintReq,
                provider: activeProvider,
                model: activeModel,
                apiKey,
              },
              (res) => {
                if (chrome.runtime.lastError) {
                  resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  resolve(res);
                }
              }
            );
          });

          if (!blueprintRes.success || !blueprintRes.data?.execution_plan) {
            throw new Error(blueprintRes.error || 'Failed to generate project blueprint');
          }

          const executionPlan = blueprintRes.data.execution_plan;
          const completedFilesContext: Record<string, string> = { ...harvestedFiles };
          const actionableSteps = executionPlan.filter(
            (step) => step.action === 'MODIFY'
          );

          const totalActionable = actionableSteps.length;
          let currentStepIdx = 0;

          // Stage 2: Progressive File-by-File Completion & Instant Editor Insertion
          for (const step of actionableSteps) {
            currentStepIdx++;
            setStatus(`Solving ${step.filename} [${currentStepIdx}/${totalActionable}]...`);

            const completeReq = {
              project_id: blueprintRes.data.project_id,
              filename: step.filename,
              file_content: harvestedFiles[step.filename] || '',
              problem_title: problem.problemTitle || 'Task',
              problem_statement: problem.problemStatement || '',
              selected_language: lang,
              completed_files_context: completedFilesContext,
            };

            const completeRes = await new Promise<{
              success: boolean;
              data?: { filename: string; code: string; explanation?: string };
              error?: string;
            }>((resolve) => {
              chrome.runtime.sendMessage(
                {
                  type: 'SECURE_FORWARD_API',
                  endpoint: '/api/projects/ephemeral/complete-file',
                  payload: completeReq,
                  provider: activeProvider,
                  model: activeModel,
                  apiKey,
                },
                (res) => {
                  if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    resolve(res);
                  }
                }
              );
            });

            if (completeRes.success && completeRes.data?.code) {
              const completedCode = completeRes.data.code;
              completedFilesContext[step.filename] = completedCode;

              // Switch to the target file tab
              await this.switchTabOnPage(step.filename);
              await new Promise((r) => setTimeout(r, 120));

              // Insert the completed code safely into Monaco with explicit target file
              await this.insertCodeIntoEditor(completedCode, step.filename);
              await new Promise((r) => setTimeout(r, 150));
            }
          }

          // Stage 3: Trigger Run & Test
          setStatus('Running App...', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)');
          const runTriggered = await this.triggerRunOnPage();

          if (runTriggered) {
            setStatus('Testing & Verifying...', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)');
            let checks = 0;
            const pollTimer = setInterval(async () => {
              checks++;
              const runStatus = await this.getRunStatusFromPage();
              if (runStatus.status === 'SUCCESS') {
                clearInterval(pollTimer);
                setStatus('✓ Tests Passed! Submitting...', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
                await this.triggerSubmitOnPage();
                await new Promise((r) => setTimeout(r, 2200));
                const nextTriggered = await this.triggerNextOnPage();
                if (nextTriggered) {
                  setStatus('✓ Submitted! Next Module ▶', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
                } else {
                  setStatus('✓ App Verified & Submitted!', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
                }
                setTimeout(() => {
                  this.isBusy = false;
                  setStatus('Auto-Pilot Solve');
                  onFinishCollapse();
                }, 3500);
              } else if (checks > 10) {
                clearInterval(pollTimer);
                setStatus('✓ Project Updated & Running!', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
                setTimeout(() => {
                  this.isBusy = false;
                  setStatus('Auto-Pilot Solve');
                  onFinishCollapse();
                }, 3500);
              }
            }, 1000);
          } else {
            setStatus('✓ Code Updated! (Ctrl+Z)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            setTimeout(() => {
              this.isBusy = false;
              setStatus('Auto-Pilot Solve');
              onFinishCollapse();
            }, 3000);
          }
          return;
        }

        // Single-file fallback inside Monaco
        setStatus('Solving Project...');
        const payload = {
          title: problem.problemTitle || problem.problemCode || 'Project Task',
          problem_statement: problem.problemStatement || 'Complete the application according to instructions.',
          constraints: problem.constraints || '',
          selected_language: lang,
          starter_code: Object.values(harvestedFiles)[0] || undefined,
          workspace_files: Object.keys(harvestedFiles).length > 0 ? harvestedFiles : undefined,
          platform: 'codechef',
        };

        const response = await new Promise<{
          success: boolean;
          data?: { code: string; workspace_files?: Record<string, string> };
          error?: string;
        }>((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'SOLVE_PROBLEM_AUTO', payload, provider: activeProvider, model: activeModel, apiKey },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(res);
              }
            }
          );
        });

        if (!response.success || (!response.data?.code && !response.data?.workspace_files)) {
          throw new Error(response.error || 'Failed to generate solution');
        }

        setStatus('Updating Code...');
        let filesMap: Record<string, string> = {};
        if (response.data?.workspace_files) {
          if (Array.isArray(response.data.workspace_files)) {
            for (const item of response.data.workspace_files as any[]) {
              const name = item?.filename || item?.fileName || item?.name;
              if (name && item?.code) {
                filesMap[name] = item.code;
              }
            }
          } else if (typeof response.data.workspace_files === 'object') {
            filesMap = response.data.workspace_files as Record<string, string>;
          }
        }

        if (Object.keys(filesMap).length > 0) {
          await this.applyMultiFileUpdates(filesMap);
        } else if (response.data?.code) {
          // Cross-verify target file name before inserting to prevent file contamination across React, Spring Boot, Python
          const targetFile = this.inferTargetFilename(response.data.code, lang);
          if (targetFile) {
            await this.switchTabOnPage(targetFile);
          }
          await this.insertCodeIntoEditor(response.data.code);
        }

        setStatus('Running App...', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)');
        const runTriggered = await this.triggerRunOnPage();

        if (runTriggered) {
          setStatus('✓ App Running! (Ctrl+Z)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
        } else {
          setStatus('✓ Code Updated! (Ctrl+Z)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
        }

        setTimeout(() => {
          this.isBusy = false;
          setStatus('1-Click Auto Solve');
          onFinishCollapse();
        }, 4000);
        return;
      }

      // 2. Fetch starter code from Ace Editor via custom event
      setStatus('Reading Editor...');
      let starterCode = '';
      try {
        const editorCodeRes = await this.queryEditorCode();
        if (editorCodeRes && editorCodeRes.code && editorCodeRes.code.trim().length > 5) {
          starterCode = editorCodeRes.code;
        }
      } catch {
        // Fallback if starter code not yet mounted
      }

      // 3. Normalize Language using shared utility
      const lang = normalizeLanguage(problem.language || 'cpp');

      // 4. Request Solution Generation from Background Service Worker
      setStatus('Solving with AI...');
      const payload = {
        title: problem.problemTitle || problem.problemCode || 'CodeChef Problem',
        problem_statement: problem.problemStatement || 'Solve the competitive programming problem optimally.',
        constraints: problem.constraints || '',
        selected_language: lang,
        starter_code: starterCode || undefined,
        platform: 'codechef',
      };

      const response = await new Promise<{ success: boolean; data?: { code: string }; error?: string }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'SOLVE_PROBLEM_AUTO', payload, provider: activeProvider, model: activeModel, apiKey },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res);
            }
          }
        );
      });

      if (!response.success || !response.data?.code) {
        throw new Error(response.error || 'Failed to generate solution');
      }

      // 5. Replace Code in Ace Editor
      setStatus('Inserting Code...');
      const targetFile = this.inferTargetFilename(response.data.code, lang);
      if (targetFile) {
        await this.switchTabOnPage(targetFile);
      }
      await this.insertCodeIntoEditor(response.data.code);

      // 6. Trigger Test Run on CodeChef
      setStatus('Running Tests...', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)');
      const runTriggered = await this.triggerRunOnPage();

      if (runTriggered) {
        // Poll test results for up to 10 seconds
        let checks = 0;
        const pollTimer = setInterval(async () => {
          checks++;
          const runStatus = await this.getRunStatusFromPage();
          if (runStatus.status === 'SUCCESS') {
            clearInterval(pollTimer);
            setStatus('✓ Tests Passed! Submitting...', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            await this.triggerSubmitOnPage();
            await new Promise((r) => setTimeout(r, 2200));
            const nextTriggered = await this.triggerNextOnPage();
            if (nextTriggered) {
              setStatus('✓ Submitted! Next Problem ▶', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            } else {
              setStatus('✓ Submitted Successfully!', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            }
            setTimeout(() => {
              this.isBusy = false;
              setStatus('Auto-Pilot Solve');
              onFinishCollapse();
            }, 3500);
          } else if (runStatus.status === 'ERROR') {
            clearInterval(pollTimer);
            setStatus('⚠️ Error! Check Panel', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)');
            setTimeout(() => {
              this.isBusy = false;
              setStatus('Auto-Pilot Solve');
              onFinishCollapse();
            }, 4000);
          } else if (checks > 12) {
            clearInterval(pollTimer);
            setStatus('✓ Replaced! (Ctrl+Z)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
            setTimeout(() => {
              this.isBusy = false;
              setStatus('Auto-Pilot Solve');
              onFinishCollapse();
            }, 3000);
          }
        }, 1000);
      } else {
        // If Run button wasn't clicked, show clean replacement confirmation
        setStatus('✓ Replaced! (Ctrl+Z)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)');
        setTimeout(() => {
          this.isBusy = false;
          setStatus('Auto-Pilot Solve');
          onFinishCollapse();
        }, 3000);
      }

    } catch (err) {
      console.error('[CodeMate AI] 1-Click Auto Solve failed:', err);
      const errMessage = err instanceof Error ? err.message : 'Error';
      if (errMessage.includes('Extension context invalidated')) {
        setStatus('⚠️ Extension updated. Refresh page (F5)', 'linear-gradient(135deg, #d97706 0%, #b45309 100%)');
      } else if (errMessage.includes('timed out') || errMessage.includes('504')) {
        setStatus('⚠️ AI timed out. Retry?', '#ef4444');
      } else if (errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('busy')) {
        setStatus('⚠️ AI busy. Retry in 5s', 'linear-gradient(135deg, #d97706 0%, #b45309 100%)');
      } else {
        setStatus(`⚠️ ${errMessage.slice(0, 18)}`, '#ef4444');
      }
      setTimeout(() => {
        this.isBusy = false;
        setStatus('1-Click Auto Solve');
        onFinishCollapse();
      }, 4500);
    }
  }

  /**
   * Helper to query Ace editor value via DOM bridge
   */
  private static queryEditorCode(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      const nonce = `cm_launcher_${Date.now()}`;
      const timer = setTimeout(() => reject(new Error('Timeout querying editor')), 2500);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean; data?: { code: string } }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          if (customEvent.detail.success && customEvent.detail.data) {
            resolve(customEvent.detail.data);
          } else {
            reject(new Error('Failed reading editor'));
          }
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'GET_VALUE' },
        })
      );
    });
  }

  /**
   * Helper to insert code into Ace editor via DOM bridge
   */
  private static insertCodeIntoEditor(code: string, targetFile?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const nonce = `cm_insert_${Date.now()}`;
      const timer = setTimeout(() => reject(new Error('Timeout inserting code')), 3500);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          if (customEvent.detail.success) {
            resolve(true);
          } else {
            reject(new Error('Failed inserting code into editor'));
          }
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'INSERT_CODE', payload: { code, mode: 'replace', targetFile } },
        })
      );
    });
  }

  /**
   * Helper to switch active editor tab via DOM bridge
   */
  private static switchTabOnPage(fileName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const nonce = `cm_tab_${Date.now()}`;
      const timer = setTimeout(() => resolve(false), 2000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(!!customEvent.detail.success);
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'SWITCH_TAB', payload: { fileName } },
        })
      );
    });
  }

  /**
   * Framework-agnostic target filename inference (Java, React/TS, Python, C++)
   */
  private static inferTargetFilename(code: string, currentLang: string): string | null {
    if (!code) return null;

    // Java: public class StudentService -> StudentService.java
    const javaMatch = code.match(/public\s+(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)/);
    if (javaMatch && javaMatch[1]) {
      return `${javaMatch[1]}.java`;
    }

    // React / TypeScript: export default function App / const Navbar: React.FC
    const reactMatch = code.match(/(?:export\s+default\s+(?:function|class)\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*:\s*React\.FC)/);
    const reactName = reactMatch ? (reactMatch[1] || reactMatch[2]) : null;
    if (reactName) {
      return `${reactName}.tsx`;
    }

    // Python: class UserService -> user_service.py
    const pyMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
    if (pyMatch && pyMatch[1] && currentLang.toLowerCase().includes('py')) {
      const snake = pyMatch[1].replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
      return `${snake}.py`;
    }

    return null;
  }

  /**
   * Helper to trigger Run button in MAIN world
   */
  private static triggerRunOnPage(): Promise<boolean> {
    return new Promise((resolve) => {
      const nonce = `cm_run_${Date.now()}`;
      const timer = setTimeout(() => resolve(false), 2000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(!!customEvent.detail.success);
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'TRIGGER_RUN' },
        })
      );
    });
  }

  /**
   * Helper to trigger Submit button in MAIN world
   */
  private static triggerSubmitOnPage(): Promise<boolean> {
    return new Promise((resolve) => {
      const nonce = `cm_submit_${Date.now()}`;
      const timer = setTimeout(() => resolve(false), 2000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(!!customEvent.detail.success);
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'TRIGGER_SUBMIT' },
        })
      );
    });
  }

  /**
   * Helper to trigger Next problem / Next module button in MAIN world
   */
  private static triggerNextOnPage(): Promise<boolean> {
    return new Promise((resolve) => {
      const nonce = `cm_next_${Date.now()}`;
      const timer = setTimeout(() => resolve(false), 2000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(!!customEvent.detail.success);
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'TRIGGER_NEXT' },
        })
      );
    });
  }

  /**
   * Helper to inspect test run results in MAIN world
   */
  private static getRunStatusFromPage(): Promise<{ status: string; details?: string }> {
    return new Promise((resolve) => {
      const nonce = `cm_status_${Date.now()}`;
      const timer = setTimeout(() => resolve({ status: 'IDLE' }), 1500);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean; data?: { status: string; details?: string } }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(customEvent.detail.data || { status: 'IDLE' });
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'GET_RUN_STATUS' },
        })
      );
    });
  }

  /**
   * Helper to harvest all open files across Monaco tabs via DOM bridge
   */
  private static harvestWorkspaceFiles(): Promise<Record<string, string>> {
    return new Promise((resolve) => {
      const nonce = `cm_harvest_${Date.now()}`;
      const timer = setTimeout(() => resolve({}), 6000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean; data?: Record<string, string> }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          if (customEvent.detail.success && customEvent.detail.data) {
            resolve(customEvent.detail.data);
          } else {
            resolve({});
          }
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'HARVEST_WORKSPACE' },
        })
      );
    });
  }

  /**
   * Helper to apply multi-file updates across Monaco tabs via DOM bridge
   */
  private static applyMultiFileUpdates(files: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const nonce = `cm_patch_${Date.now()}`;
      const timer = setTimeout(() => resolve(false), 10000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent<{ nonce: string; success: boolean }>;
        if (customEvent.detail && customEvent.detail.nonce === nonce) {
          clearTimeout(timer);
          window.removeEventListener('CODEMATE_RESPONSE', handler);
          resolve(!!customEvent.detail.success);
        }
      };

      window.addEventListener('CODEMATE_RESPONSE', handler);
      window.dispatchEvent(
        new CustomEvent('CODEMATE_REQUEST', {
          detail: { nonce, operation: 'APPLY_MULTIFILE_PATCH', payload: { files } },
        })
      );
    });
  }

  public static remove(): void {
    const existing = document.getElementById(this.CONTAINER_ID);
    if (existing) {
      existing.remove();
    }
  }
}
