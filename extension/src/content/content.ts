/**
 * CodeMate AI — Hardened Isolated World Content Script (content.ts)
 * 
 * Bridges Chrome Extension messaging to content-main.ts via cryptographically
 * randomized nonces, strict message payload validation, and teardown timeouts.
 */

import { PageDetector } from './page-detector';
import { PageObserver } from './page-observer';
import { FloatingLauncher } from './floating-launcher';
import { ExtensionMessage, MessageResponse } from '../types/messaging';
import { EditorStatus, InsertionResult, EditorOperation } from '../types/editor';
import { ClipboardManager } from '../clipboard/clipboard-manager';

(function () {
  'use strict';

  const CHANNEL_REQUEST = 'CODEMATE_REQUEST';
  const CHANNEL_RESPONSE = 'CODEMATE_RESPONSE';

  // Secure session authentication handshake with content-main.ts
  const bridgeSecret = document.documentElement.getAttribute('data-cm-sec') || '';
  if (bridgeSecret) {
    document.documentElement.removeAttribute('data-cm-sec');
  }

  function generateSecureNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Listen for responses dispatched by content-main.ts
  window.addEventListener(CHANNEL_RESPONSE, (event: Event) => {
    const customEvent = event as CustomEvent<{
      nonce?: string;
      requestId?: string;
      success: boolean;
      data?: unknown;
      error?: { code: string; message: string };
    }>;
    const detail = customEvent.detail;
    if (!detail || typeof detail !== 'object') return;

    const nonce = detail.nonce || detail.requestId;
    if (!nonce || typeof nonce !== 'string') return;

    const entry = pendingRequests.get(nonce);
    if (entry) {
      clearTimeout(entry.timer);
      pendingRequests.delete(nonce);
      if (detail.success) {
        entry.resolve(detail.data);
      } else {
        const errMsg = detail.error?.message || 'Operation failed in page realm';
        entry.reject(new Error(errMsg));
      }
    }
  });

  /**
   * Dispatches a typed request to content-main.ts and awaits response with timeout
   */
  function sendToMainWorld<T>(operation: EditorOperation | string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const nonce = `cm_${generateSecureNonce()}`;

      const timer = setTimeout(() => {
        if (pendingRequests.has(nonce)) {
          pendingRequests.delete(nonce);
          reject(new Error(`Timeout waiting for editor operation: ${operation}`));
        }
      }, 4000);

      pendingRequests.set(nonce, { resolve: resolve as (val: unknown) => void, reject, timer });

      window.dispatchEvent(
        new CustomEvent(CHANNEL_REQUEST, {
          detail: {
            secret: bridgeSecret,
            nonce,
            requestId: nonce,
            operation,
            action: operation, // backwards compatibility
            payload,
          },
        })
      );
    });
  }

  // Initialize Page Observer & Launcher if on CodeChef
  if (PageDetector.isCodeChef()) {
    FloatingLauncher.setBridgeSecret(bridgeSecret);
    let lastProblemIdentifier: string | null = null;

    const syncCurrentProblem = () => {
      if (PageDetector.isSupportedPracticePage()) {
        try {
          const problem = PageDetector.getProblemContext();
          const currentId = problem.problemCode || problem.problemTitle;
          // Evict stale multi-file working memory whenever the user switches problem statements
          if (lastProblemIdentifier && currentId && lastProblemIdentifier !== currentId) {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.remove(['codemate_multifile_session_v1']);
              chrome.storage.local.get(['codemate_ai_settings_v1'], (st) => {
                const defaultApi = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
                const baseUrl = st?.codemate_ai_settings_v1?.backendUrl || defaultApi;
                fetch(`${baseUrl}/api/projects/ephemeral/clear-context`, { method: 'POST' }).catch(() => {});
              });
            }
          }
          if (currentId) {
            lastProblemIdentifier = currentId;
          }

          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ codemate_active_problem_v1: problem });
          }
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'PAGE_PROBLEM_UPDATED', problem }).catch(() => {});
          }
        } catch (err) {
          console.warn('[CodeMate AI] Error syncing problem context:', err);
        }
      }
    };

    if (PageDetector.isSupportedPracticePage()) {
      FloatingLauncher.inject();
      syncCurrentProblem();
    }

    const observer = new PageObserver((changeType) => {
      if (PageDetector.isSupportedPracticePage()) {
        FloatingLauncher.inject();
        syncCurrentProblem();
        if (changeType === 'NAVIGATION') {
          setTimeout(syncCurrentProblem, 500);
          setTimeout(syncCurrentProblem, 1500);
          setTimeout(syncCurrentProblem, 3000);
        }
      } else {
        FloatingLauncher.remove();
      }
    });

    observer.start();
  }

  // --- BI-DIRECTIONAL AUTH SYNCHRONIZATION BRIDGE (Web <-> Extension) ---
  const configuredPortalUrl = (import.meta as any).env?.VITE_WEB_PORTAL_URL || 'http://localhost:3000';
  const TRUSTED_PORTAL_ORIGINS = new Set<string>();

  try {
    TRUSTED_PORTAL_ORIGINS.add(new URL(configuredPortalUrl).origin);
  } catch {
    TRUSTED_PORTAL_ORIGINS.add('http://localhost:3000');
  }

  // Also include any extra origins specified in VITE_ALLOWED_ORIGINS (.env)
  const envAllowedOrigins = (import.meta as any).env?.VITE_ALLOWED_ORIGINS || '';
  envAllowedOrigins.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((entry: string) => {
    try {
      TRUSTED_PORTAL_ORIGINS.add(new URL(entry).origin);
    } catch {}
  });

  const isCodemateWeb = TRUSTED_PORTAL_ORIGINS.has(window.location.origin);

  if (isCodemateWeb) {
    // 1. Proactively push existing extension session to web dashboard on load with exact targetOrigin
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['codemate_auth_tokens_v1', 'codemate_user_v1'], (st) => {
        if (st?.codemate_auth_tokens_v1?.access_token) {
          window.postMessage(
            {
              type: 'CODEMATE_EXT_AUTH_SYNC',
              tokens: st.codemate_auth_tokens_v1,
            },
            window.location.origin
          );
        }
      });
    }

    // 2. Listen for messages from web application with strict origin and schema checks
    window.addEventListener('message', (event) => {
      if (
        event.source !== window ||
        event.origin !== window.location.origin ||
        !event.data ||
        typeof event.data !== 'object'
      ) {
        return;
      }

      if (event.data.type === 'CODEMATE_WEB_AUTH_SYNC' && typeof event.data.tokens?.access_token === 'string') {
        const tokens = event.data.tokens;
        chrome.storage.local.set({
          codemate_auth_tokens_v1: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || tokens.access_token,
            user: tokens.user,
          },
          codemate_user_v1: tokens.user,
        });
      } else if (event.data.type === 'CODEMATE_WEB_LOGOUT_SYNC') {
        chrome.storage.local.remove(['codemate_auth_tokens_v1', 'codemate_user_v1', 'codemate_subscription_v1']);
      } else if (event.data.type === 'CODEMATE_REQUEST_AUTH_SYNC') {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['codemate_auth_tokens_v1', 'codemate_user_v1'], (st) => {
            if (st?.codemate_auth_tokens_v1?.access_token) {
              window.postMessage(
                {
                  type: 'CODEMATE_EXT_AUTH_SYNC',
                  tokens: st.codemate_auth_tokens_v1,
                },
                window.location.origin
              );
            }
          });
        }
      }
    });
  }

  // Handle Chrome Extension Messages
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse: (res: MessageResponse) => void) => {
      if (!message || typeof message !== 'object' || !message.type) {
        sendResponse({ success: false, error: 'Malformed message received' });
        return false;
      }

      if (message.type === 'PING') {
        sendResponse({ success: true, data: { status: 'PONG', url: window.location.href } });
        return false;
      }

      if (message.type === 'GET_PAGE_STATUS') {
        const problem = PageDetector.getProblemContext();
        sendToMainWorld<EditorStatus>('GET_STATUS')
          .then((editor) => {
            sendResponse({
              success: true,
              data: {
                supported: PageDetector.isSupportedPracticePage(),
                platform: problem.platform,
                url: problem.url,
                problem,
                editor,
              },
            });
          })
          .catch((err) => {
            sendResponse({
              success: true,
              data: {
                supported: PageDetector.isSupportedPracticePage(),
                platform: 'CodeChef',
                url: window.location.href,
                problem,
                editor: {
                  detected: false,
                  framework: 'UNKNOWN',
                  version: null,
                  mode: null,
                  readOnly: false,
                  lineCount: 0,
                  characterCount: 0,
                  adapterReady: false,
                  insertionSupported: false,
                  containerId: null,
                  domPresent: false,
                  error: err instanceof Error ? err.message : String(err),
                },
              },
            });
          });
        return true;
      }

      if (message.type === 'GET_EDITOR_STATUS') {
        sendToMainWorld<EditorStatus>('GET_STATUS')
          .then((status) => sendResponse({ success: true, data: status }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'GET_EDITOR_CODE') {
        sendToMainWorld<{ code: string; lineCount: number; charCount: number }>('GET_VALUE')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'GET_PROBLEM_INFO') {
        const problem = PageDetector.getProblemContext();
        sendResponse({ success: true, data: problem });
        return false;
      }

      if (message.type === 'INSERT_CODE') {
        sendToMainWorld<InsertionResult>('INSERT_CODE', message.payload)
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'UNDO_EDITOR') {
        sendToMainWorld<{ success: boolean }>('UNDO')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'REDO_EDITOR') {
        sendToMainWorld<{ success: boolean }>('REDO')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'TRIGGER_RUN') {
        sendToMainWorld<{ triggered: boolean }>('TRIGGER_RUN')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'TRIGGER_SUBMIT') {
        sendToMainWorld<{ triggered: boolean }>('TRIGGER_SUBMIT')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'TRIGGER_NEXT') {
        sendToMainWorld<{ triggered: boolean }>('TRIGGER_NEXT')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'GET_RUN_STATUS') {
        sendToMainWorld<{ status: string; details?: string }>('GET_RUN_STATUS')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'HARVEST_WORKSPACE') {
        sendToMainWorld<Record<string, string>>('HARVEST_WORKSPACE')
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'APPLY_MULTIFILE_PATCH') {
        sendToMainWorld<{ success: boolean; updatedFiles: string[] }>('APPLY_MULTIFILE_PATCH', message.payload)
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'SWITCH_TAB') {
        sendToMainWorld<{ switched: boolean }>('SWITCH_TAB', message.payload)
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'OPEN_FILE') {
        sendToMainWorld<{ opened: boolean }>('OPEN_FILE', message.payload)
          .then((data) => sendResponse({ success: true, data }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      if (message.type === 'TEST_CLIPBOARD_READ') {
        ClipboardManager.testRead()
          .then((status) => sendResponse({ success: true, data: status }))
          .catch((err) => sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }));
        return true;
      }

      // Reject unrecognized message types
      sendResponse({ success: false, error: `Unrecognized message type: ${message.type}` });
      return false;
    }
  );

  console.log('[CodeMate AI] Hardened Isolated content script initialized.');
})();
