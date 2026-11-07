/**
 * CodeMate AI — Hardened Service Worker (background/service-worker.ts)
 * 
 * Secure message broker handling side panel triggers and trusted API forwarding.
 * Strictly validates message senders, target origins, and request timeouts.
 */

// Trusted API Base URL prefixes (local dev & production)
const ALLOWED_API_ORIGIN_PATTERNS = [
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/[a-z0-9-]+\.codemateai\.com$/,
  /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
];

function isOriginAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin;
    return ALLOWED_API_ORIGIN_PATTERNS.some((pat) => pat.test(origin));
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
    const rawBaseUrl = message.baseUrl || 'http://127.0.0.1:8000';
    if (!isOriginAllowed(rawBaseUrl)) {
      console.error('[CodeMate AI Security] Blocked API forwarding to unapproved origin:', rawBaseUrl);
      sendResponse({
        success: false,
        error: `Target backend URL '${rawBaseUrl}' is not permitted by extension security policy.`,
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

    chrome.storage.local.get(['codemate_auth_tokens_v1', 'codemate_auth_tokens'], (store) => {
      const tokens = store.codemate_auth_tokens_v1 || store.codemate_auth_tokens;
      if (tokens && tokens.access_token) {
        headers['Authorization'] = `Bearer ${tokens.access_token}`;
      }

      fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(message.payload || {}),
        signal: controller.signal,
      })
        .then(async (res) => {
          clearTimeout(timeoutTimer);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => {
          clearTimeout(timeoutTimer);
          const errMsg = err.name === 'AbortError' ? 'Backend request timed out (75s)' : err.message || 'Network error';
          sendResponse({ success: false, error: errMsg });
        });
    });

    return true; // Keep message channel open for async response
  }

  // Reject unrecognized message types
  sendResponse({ success: false, error: `Unrecognized message type: ${message.type}` });
  return false;
});
