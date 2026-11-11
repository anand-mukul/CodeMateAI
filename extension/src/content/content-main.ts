/**
 * CodeMate AI — MAIN World Script (content-main.ts)
 * 
 * Runs in the webpage execution realm to directly access `window.ace`
 * and DOM expando properties (`#submit-ide-v2.env.editor`).
 * 
 * SECURITY: Never expose privileged extension APIs in the MAIN world.
 */

import { EditorManager } from '../editor/editor-manager';
import { VsCodeWebAdapter } from '../editor/adapters/vscode-web-adapter';
import { EditorOperation, InsertionMode } from '../types/editor';

(function () {
  'use strict';

  const CHANNEL_REQUEST = 'CODEMATE_REQUEST';
  const CHANNEL_RESPONSE = 'CODEMATE_RESPONSE';

  // Secure session authentication handshake for isolated world bridge
  const sessionSecret =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  document.documentElement.setAttribute('data-cm-sec', sessionSecret);
  setTimeout(() => {
    if (document.documentElement.hasAttribute('data-cm-sec')) {
      document.documentElement.removeAttribute('data-cm-sec');
    }
  }, 250);

  const editorManager = EditorManager.getInstance();

  interface CustomEventDetail {
    secret?: string;
    nonce?: string;
    requestId?: string; // backwards compatibility
    operation?: EditorOperation;
    action?: string;    // backwards compatibility
    payload?: {
      text?: string;
      code?: string;
      mode?: InsertionMode;
      confirmReplace?: boolean;
      fileName?: string;
      targetFile?: string;
      files?: Record<string, string>;
    };
  }

  window.addEventListener(CHANNEL_REQUEST, async (event: Event) => {
    const customEvent = event as CustomEvent<CustomEventDetail>;
    const detail = customEvent.detail;
    if (!detail) return;

    // Reject unauthenticated requests from untrusted webpage scripts
    if (!detail.secret || detail.secret !== sessionSecret) {
      console.warn('[CodeMate AI Security] Rejected unauthenticated editor bridge request');
      return;
    }

    // Support both nonce and requestId
    const nonce = detail.nonce || detail.requestId;
    if (!nonce || typeof nonce !== 'string') return;

    const op = (detail.operation || detail.action || '').toUpperCase();
    const payload = detail.payload;

    let success = false;
    let responseData: unknown = null;
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = '';

    try {
      switch (op) {
        case 'GET_STATUS':
        case 'GET_EDITOR_STATUS': {
          responseData = editorManager.getStatus();
          success = true;
          break;
        }

        case 'GET_VALUE':
        case 'GET_EDITOR_CODE': {
          const adapter = editorManager.getActiveAdapter();
          const activeTab = adapter instanceof VsCodeWebAdapter ? adapter.getActiveTab() : null;
          const code = editorManager.getValue();
          const lines = code ? code.split('\n').length : 0;
          responseData = {
            code,
            lineCount: lines,
            charCount: code.length,
            activeTab,
          };
          success = true;
          break;
        }

        case 'HARVEST_WORKSPACE': {
          const adapter = editorManager.getActiveAdapter();
          if (adapter instanceof VsCodeWebAdapter && adapter.isMultiFileWorkspace()) {
            responseData = await adapter.harvestAllOpenFiles();
            success = true;
          } else {
            const code = editorManager.getValue();
            responseData = { 'main': code };
            success = true;
          }
          break;
        }

        case 'APPLY_MULTIFILE_PATCH': {
          const files = payload?.files || {};
          const adapter = editorManager.getActiveAdapter();
          if (adapter instanceof VsCodeWebAdapter) {
            const res = await adapter.applyMultiFileUpdates(files);
            responseData = res;
            success = res.success;
            if (!res.success) {
              errorCode = 'PATCH_APPLY_FAILED';
              errorMessage = 'Failed to apply updates to workspace files';
            }
          } else {
            const code = Object.values(files)[0] || '';
            const res = await editorManager.insertCode(code, 'replace');
            responseData = res;
            success = res.success;
            if (!res.success) {
              errorCode = res.errorCode || 'INSERTION_FAILED';
              errorMessage = res.error || 'Replacement failed';
            }
          }
          break;
        }

        case 'SWITCH_TAB': {
          const fileName = payload?.fileName || '';
          const adapter = editorManager.getActiveAdapter();
          if (adapter instanceof VsCodeWebAdapter) {
            const switched = await adapter.switchTab(fileName);
            responseData = { switched };
            success = switched;
          } else {
            responseData = { switched: false };
            success = false;
          }
          break;
        }

        case 'OPEN_FILE': {
          const fileName = payload?.fileName || '';
          const adapter = editorManager.getActiveAdapter();
          if (adapter instanceof VsCodeWebAdapter) {
            const opened = await adapter.openWorkspaceFile(fileName);
            responseData = { opened };
            success = opened;
          } else {
            responseData = { opened: false };
            success = false;
          }
          break;
        }

        case 'INSERT_AT_CURSOR': {
          const text = payload?.text || payload?.code || '';
          const res = await editorManager.insertCode(text, 'cursor');
          responseData = res;
          success = res.success;
          if (!res.success) {
            errorCode = res.errorCode || 'INSERTION_FAILED';
            errorMessage = res.error || 'Insertion failed';
          }
          break;
        }

        case 'REPLACE_ALL': {
          const text = payload?.text || payload?.code || '';
          const res = await editorManager.insertCode(text, 'replace');
          responseData = res;
          success = res.success;
          if (!res.success) {
            errorCode = res.errorCode || 'INSERTION_FAILED';
            errorMessage = res.error || 'Replacement failed';
          }
          break;
        }

        case 'INSERT_CODE': {
          const text = payload?.text || payload?.code || '';
          const mode = payload?.mode || 'cursor';
          const explicitTarget = payload?.targetFile || payload?.fileName;

          // Target tab safety guard for VS Code Web / Monaco
          const adapter = editorManager.getActiveAdapter();
          if (adapter instanceof VsCodeWebAdapter && text && explicitTarget) {
            const targetFile = explicitTarget;
            const openTabs = adapter.getOpenTabs();
            if (openTabs.length > 1) {
              const activeTab = adapter.getActiveTab();
              if (activeTab && !adapter.isMatchingFile(activeTab, targetFile)) {
                console.log(`[CodeMate AI] Auto-switching tab from '${activeTab}' to '${targetFile}' before insertion`);
                const switched = await adapter.switchTab(targetFile);
                if (!switched) {
                  await adapter.openWorkspaceFile(targetFile);
                }
                await new Promise((r) => setTimeout(r, 300));
              }

              // Verify active tab matches target file before modifying!
              let currentActive = adapter.getActiveTab();
              let retries = 0;
              while (retries < 5 && currentActive && !adapter.isMatchingFile(currentActive, targetFile)) {
                await adapter.switchTab(targetFile);
                await new Promise((r) => setTimeout(r, 200));
                currentActive = adapter.getActiveTab();
                retries++;
              }

              if (currentActive && !adapter.isMatchingFile(currentActive, targetFile)) {
                console.warn(
                  `[CodeMate AI] Active editor tab '${currentActive}' did not switch to '${targetFile}', but Tier-1 will locate model by URI path.`
                );
              }
            }

            // Pass explicit targetFilename to insertText so it can find the correct Monaco model
            // by URI path instead of relying on getActiveTab() which may still reflect old breadcrumb
            const res = await adapter.insertText(text, mode, targetFile);
            responseData = res;
            success = res.success;
            if (!res.success) {
              errorCode = res.errorCode || 'INSERTION_FAILED';
              errorMessage = res.error || 'Insertion failed';
            }
            break;
          }

          const res = await editorManager.insertCode(text, mode);
          responseData = res;
          success = res.success;
          if (!res.success) {
            errorCode = res.errorCode || 'INSERTION_FAILED';
            errorMessage = res.error || 'Insertion failed';
          }
          break;
        }

        case 'FOCUS':
        case 'FOCUS_EDITOR': {
          editorManager.focus();
          responseData = { success: true };
          success = true;
          break;
        }

        case 'GET_SELECTION': {
          responseData = editorManager.getSelection();
          success = true;
          break;
        }

        case 'UNDO':
        case 'UNDO_EDITOR': {
          const undone = editorManager.undo();
          responseData = { success: undone };
          success = undone;
          if (!undone) {
            errorMessage = 'Undo unavailable or nothing to undo';
          }
          break;
        }

        case 'REDO':
        case 'REDO_EDITOR': {
          const redone = editorManager.redo();
          responseData = { success: redone };
          success = redone;
          if (!redone) {
            errorMessage = 'Redo unavailable or nothing to redo';
          }
          break;
        }

        case 'TRIGGER_RUN': {
          const runBtn = findRunButton();
          if (runBtn) {
            runBtn.click();
            responseData = { triggered: true };
            success = true;
          } else {
            errorCode = 'BUTTON_NOT_FOUND';
            errorMessage = 'Could not locate Run button on page';
            success = false;
          }
          break;
        }

        case 'TRIGGER_SUBMIT': {
          const submitBtn = findSubmitButton();
          if (submitBtn) {
            submitBtn.click();
            responseData = { triggered: true };
            success = true;
          } else {
            errorCode = 'BUTTON_NOT_FOUND';
            errorMessage = 'Could not locate Submit button on page';
            success = false;
          }
          break;
        }

        case 'TRIGGER_NEXT': {
          const nextBtn = findNextButton();
          if (nextBtn) {
            nextBtn.click();
            responseData = { triggered: true };
            success = true;
          } else {
            errorCode = 'BUTTON_NOT_FOUND';
            errorMessage = 'Could not locate Next problem / Next module button on page';
            success = false;
          }
          break;
        }

        case 'GET_RUN_STATUS': {
          responseData = readTestResults();
          success = true;
          break;
        }

        default: {
          errorCode = 'UNSUPPORTED_OPERATION';
          errorMessage = `Unsupported editor operation: ${op}`;
          success = false;
        }
      }
    } catch (err) {
      success = false;
      errorCode = 'RUNTIME_ERROR';
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // Dispatch typed response back to isolated world
    window.dispatchEvent(
      new CustomEvent(CHANNEL_RESPONSE, {
        detail: {
          nonce,
          requestId: nonce, // backwards compatibility
          success,
          data: responseData,
          error: success ? undefined : { code: errorCode, message: errorMessage },
        },
      })
    );
  });

  function findRunButton(): HTMLElement | null {
    const selectors = [
      '#compile_btn',
      'button._compile__btn_lh4w3_8',
      'button[id="compile_btn"]',
      'button[data-testid*="run"]',
      'button[id*="run"]',
      '#run-btn',
      '#run-code-button',
      '.run-button',
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el instanceof HTMLElement) return el;
    }
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      const t = (btn.textContent || '').trim().toLowerCase();
      if (t === 'run' || t.startsWith('run ') || t === '▶ run' || t.includes('run code')) {
        return btn;
      }
    }
    return null;
  }

  function findSubmitButton(): HTMLElement | null {
    const selectors = [
      '#submit_btn',
      'button[id="submit_btn"]',
      'button[class*="_submit__btn_"]',
      'button[data-testid*="submit"]',
      'button[id*="submit"]',
      '#submit-code-button',
      '#submit-btn',
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el instanceof HTMLElement) return el;
    }
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const btn of buttons) {
      const t = (btn.textContent || '').trim().toLowerCase();
      if (t === 'submit' || t === 'submit code') {
        return btn;
      }
    }
    return null;
  }

  function findNextButton(): HTMLElement | null {
    const selectors = [
      'button[data-testid*="next"]',
      'a[data-testid*="next"]',
      'button[class*="next"]',
      'a[class*="next"]',
      'button._next__btn',
      '#next-problem-btn',
      '.next-problem',
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el instanceof HTMLElement && !el.hasAttribute('disabled')) return el;
    }

    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    for (const el of candidates) {
      const t = (el.textContent || '').trim().toLowerCase();
      if (
        (t === 'next' || t.startsWith('next ') || t.includes('next module') || t.includes('next problem') || t.startsWith('next >') || t.endsWith('> next')) &&
        !t.includes('previous') && !t.includes('prev')
      ) {
        if (el instanceof HTMLElement && !el.hasAttribute('disabled')) {
          return el;
        }
      }
    }
    return null;
  }

  function readTestResults(): { status: 'RUNNING' | 'SUCCESS' | 'ERROR' | 'IDLE'; details?: string; rawError?: string } {
    const text = (document.body.innerText || '').toLowerCase();
    if (text.includes('running...') || text.includes('compiling...')) {
      return { status: 'RUNNING' };
    }

    // Check terminal output for errors (compiler error, stack traces)
    const terminalEl = document.querySelector('.terminal, #terminal, .xterm-rows, [class*="terminal"]');
    const terminalText = terminalEl ? (terminalEl.textContent || '') : '';
    const errorMatch = terminalText.match(/(\[ERROR\].*|Exception in thread.*|SyntaxError:.*|error:.*)/i);
    const rawError = errorMatch ? errorMatch[0].trim().slice(0, 300) : undefined;

    if (text.includes('correct answer') || text.includes('sample test cases passed') || text.includes('all tests passed') || text.includes('100/100') || text.includes('100 %')) {
      return { status: 'SUCCESS', details: 'All sample cases passed!' };
    }
    if (
      text.includes('wrong answer') ||
      text.includes('compilation error') ||
      text.includes('runtime error') ||
      text.includes('time limit exceeded') ||
      rawError
    ) {
      return {
        status: 'ERROR',
        details: rawError ? `Compiler Error: ${rawError}` : 'Sample tests failed or compiler error detected',
        rawError: rawError || terminalText.slice(-400) || undefined,
      };
    }
    return { status: 'IDLE' };
  }

  console.log('[CodeMate AI] Main world adapter initialized.');
})();
