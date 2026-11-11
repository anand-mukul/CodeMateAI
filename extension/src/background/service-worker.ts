/**
 * CodeMate AI — Hardened Service Worker (background/service-worker.ts)
 * 
 * Secure message broker handling side panel triggers and trusted API forwarding.
 * Strictly validates message senders, target origins, and request timeouts.
 */

// Dynamically resolve trusted API origins from environment variables (.env)
function getTrustedApiOrigins(): Set<string> {
  const origins = new Set<string>();

  const configuredApiUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (configuredApiUrl) {
    try {
      origins.add(new URL(configuredApiUrl).origin);
    } catch {}
  }

  const allowedOriginsStr = (import.meta as any).env?.VITE_ALLOWED_ORIGINS || '';
  allowedOriginsStr.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((entry: string) => {
    try {
      origins.add(new URL(entry).origin);
    } catch {}
  });

  // Default fallback if no env provided
  if (origins.size === 0) {
    origins.add('http://localhost:8000');
    origins.add('http://127.0.0.1:8000');
    origins.add('https://api.codemateai.com');
  }

  return origins;
}

const TRUSTED_API_ORIGINS = getTrustedApiOrigins();

function isOriginAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin;

    // Direct match against environment-configured origins
    if (TRUSTED_API_ORIGINS.has(origin)) {
      return true;
    }

    // Support local testing port variations if localhost/127.0.0.1 is configured in .env
    const isLocalConfigured = Array.from(TRUSTED_API_ORIGINS).some(
      (o) => o.includes('localhost') || o.includes('127.0.0.1')
    );
    if (isLocalConfigured && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[CodeMate AI] Installed/updated:', details.reason);

  // Enable sidepanel behavior where supported (Chrome 116+)
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
      console.warn('[CodeMate AI] SidePanel behavior config:', err);
    });
  }
});

// Centralized Secure Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Sender Authentication: Must originate from this extension
  if (sender.id !== chrome.runtime.id) {
    console.warn('[CodeMate AI Security] Rejected message from unauthorized sender:', sender.id);
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  // 2. Validate message object structure
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    sendResponse({ success: false, error: 'Malformed message' });
    return false;
  }

  // Handle: Open Chromium Side Panel
  if (message.type === 'OPEN_SIDEPANEL') {
    const tabId = sender.tab?.id;
    if (tabId && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel
        .open({ tabId })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    } else {
      sendResponse({ success: false, error: 'SidePanel API unavailable for tab' });
      return false;
    }
  }

  // Handle: Secure API Forwarding (Avoids mixed-content restrictions on HTTPS problem pages)
  if (message.type === 'SOLVE_PROBLEM_AUTO' || message.type === 'SECURE_FORWARD_API') {
    const defaultApiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    const rawBaseUrl = message.baseUrl || defaultApiUrl;
    if (!isOriginAllowed(rawBaseUrl)) {
      console.error('[CodeMate AI Security] Blocked API forwarding to unapproved origin:', rawBaseUrl);
      sendResponse({
        success: false,
        error: 'The requested service endpoint is not permitted by extension security policy.',
      });
      return false;
    }

    const endpoint = message.endpoint || '/api/solution/generate';
    const targetUrl = `${rawBaseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 75000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CodeMate-Client': 'Chrome-MV3-SW',
    };
    if (message.provider) headers['X-CodeMate-Provider'] = message.provider;
    if (message.model) headers['X-CodeMate-Model'] = message.model;
    if (message.apiKey) headers['X-CodeMate-API-Key'] = message.apiKey;

    const method = (message.method || 'POST').toUpperCase();

    // Check if endpoint is public or requires authentication
    const isPublicEndpoint =
      endpoint.startsWith('/api/auth/login') ||
      endpoint.startsWith('/api/auth/register') ||
      endpoint.startsWith('/api/auth/google') ||
      endpoint.startsWith('/api/plans') ||
      endpoint.startsWith('/api/health') ||
      endpoint.startsWith('/api/ready');

    chrome.storage.local.get(['codemate_auth_tokens_v1', 'codemate_auth_tokens'], async (store) => {
      let tokens = store.codemate_auth_tokens_v1 || store.codemate_auth_tokens;
      if (!isPublicEndpoint && (!tokens || !tokens.access_token)) {
        clearTimeout(timeoutTimer);
        sendResponse({
          success: false,
          error: 'Authentication required. Please sign in to CodeMate.',
          status: 401,
        });
        return;
      }

      if (tokens && tokens.access_token) {
        headers['Authorization'] = `Bearer ${tokens.access_token}`;
      }

      try {
        let res = await fetch(targetUrl, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(message.payload || {}),
          signal: controller.signal,
        });

        // 401 Catch & Token Refresh Interceptor
        if (res.status === 401 && tokens && tokens.refresh_token) {
          console.info('[CodeMate AI ServiceWorker] Access token expired (401). Refreshing token...');
          try {
            const refreshUrl = `${rawBaseUrl.replace(/\/$/, '')}/api/auth/refresh`;
            const refreshRes = await fetch(refreshUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ refresh_token: tokens.refresh_token }),
            });

            if (refreshRes.ok) {
              const newTokens = await refreshRes.json();
              if (newTokens && newTokens.access_token) {
                tokens = {
                  ...tokens,
                  access_token: newTokens.access_token,
                  refresh_token: newTokens.refresh_token || tokens.refresh_token,
                };
                chrome.storage.local.set({
                  codemate_auth_tokens_v1: tokens,
                  codemate_auth_tokens: tokens,
                });
                headers['Authorization'] = `Bearer ${tokens.access_token}`;

                // Transparently re-issue the original request with fresh token
                res = await fetch(targetUrl, {
                  method,
                  headers,
                  body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(message.payload || {}),
                  signal: controller.signal,
                });
              }
            } else {
              console.warn('[CodeMate AI ServiceWorker] Token refresh failed with status:', refreshRes.status);
            }
          } catch (refreshErr) {
            console.warn('[CodeMate AI ServiceWorker] Error during token refresh:', refreshErr);
          }
        }

        clearTimeout(timeoutTimer);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        sendResponse({ success: true, data });
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        const errMsg = err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message || 'Network communication error';
        sendResponse({ success: false, error: errMsg });
      }
    });

    return true; // Keep message channel open for async response
  }

  // Reject unrecognized message types
  sendResponse({ success: false, error: `Unrecognized message type: ${message.type}` });
  return false;
});
