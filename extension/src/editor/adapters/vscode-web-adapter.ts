import { BaseEditorAdapter } from './base-adapter';
import { EditorStatus, InsertionMode, InsertionResult } from '../../types/editor';

interface VsCodeWorkbenchCommands {
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;
}

interface VsCodeWindow extends Window {
  workbench?: {
    commands?: VsCodeWorkbenchCommands;
    env?: Record<string, unknown>;
  };
  monaco?: {
    editor?: {
      getModels(): Array<{
        uri?: { path?: string; toString(): string };
        getValue(): string;
        getFullModelRange(): unknown;
        pushEditOperations(beforeCursor: unknown[], edits: Array<{ range: unknown; text: string }>, cursorStateComputer: () => unknown): unknown;
      }>;
    };
  };
}

export interface WorkspaceTabInfo {
  fileName: string;
  displayName: string;
  isActive: boolean;
  element: HTMLElement;
}

export interface WorkspaceTreeFile {
  name: string;
  fullPath?: string;
  isFolder: boolean;
  level?: number;
  element: HTMLElement;
}

/**
 * VsCodeWebAdapter
 * Seamlessly integrates CodeMate AI with Code-OSS / VS Code Web / Monaco Workbench instances
 * embedded on CodeChef course, project, and lab practice pages.
 */
export class VsCodeWebAdapter extends BaseEditorAdapter {
  private containerSelector: string;

  constructor(containerSelector: string = '.monaco-workbench') {
    super();
    this.containerSelector = containerSelector;
  }

  private getContainer(): HTMLElement | null {
    return (
      document.querySelector(this.containerSelector) ||
      document.querySelector('#codechef-code-editor') ||
      document.querySelector('.monaco-editor')
    );
  }

  private getMonaco(): any {
    const win = window as any;
    if (win.monaco && win.monaco.editor) {
      return win.monaco;
    }
    if (win._monaco && win._monaco.editor) {
      return win._monaco;
    }
    if (win.vscode?.monaco && win.vscode.monaco.editor) {
      return win.vscode.monaco;
    }

    // Check VS Code Web workbench editor service
    if (win.workbench) {
      try {
        const ctrl =
          win.workbench.editorService?.activeTextEditorControl ||
          win.workbench.editorService?.activeEditorPane?.getControl?.() ||
          win.workbench.activeTextEditorControl;
        if (ctrl && typeof ctrl.getModel === 'function') {
          return {
            editor: {
              getEditors: () => [ctrl],
              getModels: () => {
                const m = ctrl.getModel();
                return m ? [m] : [];
              },
            },
          };
        }
      } catch {}
    }

    // Check AMD require loader
    try {
      if (typeof win.require === 'function') {
        const m = win.require('vs/editor/editor.main');
        if (m && m.editor) return m;
      }
    } catch {}

    // Check embedded iframes if any
    try {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const f of iframes) {
        try {
          const frameWin = f.contentWindow as any;
          if (frameWin && frameWin.monaco && frameWin.monaco.editor) {
            return frameWin.monaco;
          }
          if (typeof frameWin?.require === 'function') {
            const m = frameWin.require('vs/editor/editor.main');
            if (m && m.editor) return m;
          }
        } catch {}
      }
    } catch {}

    // Deep inspect Monaco instances attached to DOM nodes (both string properties and Symbol properties)
    try {
      const editorNodes = Array.from(
        document.querySelectorAll(
          '.monaco-editor, .monaco-workbench, .overflow-guard, .monaco-scrollable-element'
        )
      );
      for (const node of editorNodes) {
        const stringProps = Object.getOwnPropertyNames(node);
        for (const prop of stringProps) {
          try {
            const obj = (node as any)[prop];
            if (obj && typeof obj.getModel === 'function') {
              return {
                editor: {
                  getEditors: () => [obj],
                  getModels: () => {
                    const m = obj.getModel();
                    return m ? [m] : [];
                  },
                },
              };
            }
          } catch {}
        }

        const symProps = Object.getOwnPropertySymbols(node);
        for (const sym of symProps) {
          try {
            const obj = (node as any)[sym];
            if (obj && typeof obj.getModel === 'function') {
              return {
                editor: {
                  getEditors: () => [obj],
                  getModels: () => {
                    const m = obj.getModel();
                    return m ? [m] : [];
                  },
                },
              };
            }
          } catch {}
        }
      }
    } catch {}

    return null;
  }

  public detect(): boolean {
    const container = this.getContainer();
    const hasWorkbench = !!document.querySelector('.monaco-workbench');
    const hasMonacoEditor = !!document.querySelector('.monaco-editor');
    return !!(container || hasWorkbench || hasMonacoEditor);
  }

  public isMultiFileWorkspace(): boolean {
    return !!(
      document.querySelector('.tabs-container .tab') ||
      document.querySelector('.monaco-list-row') ||
      document.querySelector('.monaco-workbench')
    );
  }

  public getActiveTextarea(): HTMLTextAreaElement | null {
    const activeEditor = document.querySelector('.monaco-editor');
    if (activeEditor) {
      return activeEditor.querySelector('textarea.inputarea') as HTMLTextAreaElement | null;
    }
    return document.querySelector('textarea.inputarea') as HTMLTextAreaElement | null;
  }

  public focus(): void {
    const textarea = this.getActiveTextarea();
    if (textarea) {
      textarea.focus();
    }
  }

  public getValue(): string {
    const monaco = this.getMonaco();

    // 1. First Priority: Active focused editor directly from monaco.editor.getEditors()
    if (monaco && typeof monaco.editor?.getEditors === 'function') {
      try {
        const editors = monaco.editor.getEditors();
        const activeEd = editors.find((e: any) => e.hasTextFocus?.()) || editors[0];
        if (activeEd && typeof activeEd.getModel === 'function') {
          const model = activeEd.getModel();
          if (model) {
            const val = model.getValue();
            if (val && val.trim().length > 0) return val;
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] monaco.editor.getEditors error:', e);
      }
    }

    // 2. Second Priority: Direct Model search matching active tab or filename
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          const activeTab = this.getActiveTab();
          if (activeTab) {
            const cleanActive = this.normalizeName(activeTab);
            const cleanNoExt = cleanActive.replace(/\.[a-z0-9]+$/i, '');
            const target = models.find((m: any) => {
              const p = this.normalizeName(m.uri?.path || m.uri?.toString() || '');
              return (
                p === cleanActive ||
                p.replace(/\.[a-z0-9]+$/i, '') === cleanNoExt ||
                p.endsWith('/' + cleanActive) ||
                p.endsWith('\\' + cleanActive)
              );
            });
            if (target) {
              const val = target.getValue();
              if (val && val.trim().length > 0) return val;
            }
          }

          // If no tab matched, find the first relevant code model
          const codeModel = models.find((m: any) => {
            const p = m.uri?.path || m.uri?.toString() || '';
            return /\.(java|cpp|c|py|js|ts|html|css|json)$/i.test(p);
          }) || models[0];

          if (codeModel) {
            const val = codeModel.getValue();
            if (val && val.trim().length > 0) return val;
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] monaco.editor.getModels error:', e);
      }
    }

    // 3. Third Priority: VS Code Web workbench activeTextEditorControl
    const win = window as any;
    if (win.workbench?.editorService?.activeTextEditorControl) {
      try {
        const ctrl = win.workbench.editorService.activeTextEditorControl;
        const model = ctrl.getModel?.();
        if (model) {
          const val = model.getValue();
          if (val && val.trim().length > 0) return val;
        }
      } catch {}
    }

    // 4. Fourth Priority: Check active textarea.inputarea value
    const textarea = this.getActiveTextarea();
    if (textarea && textarea.value && textarea.value.trim().length > 0) {
      return textarea.value;
    }

    // 5. Fifth Priority (Fallback): View lines with strict vertical sort and non-breaking space replacement
    const viewLines = document.querySelector('.monaco-editor .view-lines');
    if (viewLines) {
      const lineElements = Array.from(viewLines.querySelectorAll('.view-line')) as HTMLElement[];
      if (lineElements.length > 0) {
        // Sort strictly by vertical CSS top coordinate to prevent out-of-order DOM rendering
        const sortedLines = [...lineElements].sort((a, b) => {
          const topA = parseFloat(a.style.top || '0') || 0;
          const topB = parseFloat(b.style.top || '0') || 0;
          return topA - topB;
        });

        const textFromLines = sortedLines
          .map((el) => el.innerText.replace(/\u00a0/g, ' '))
          .join('\n');

        if (textFromLines.trim().length > 0) {
          console.warn('[CodeMate AI] Warning: Extracted code via sorted DOM view-lines fallback.');
          return textFromLines;
        }
      }
    }

    return '';
  }

  public getSelection(): { start: unknown; end: unknown; text?: string } | null {
    const textarea = this.getActiveTextarea();
    if (textarea) {
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        text: textarea.value.slice(textarea.selectionStart, textarea.selectionEnd),
      };
    }
    return null;
  }

  public getStatus(): EditorStatus {
    const container = this.getContainer();
    const isDetected = this.detect();
    const currentVal = this.getValue();
    const lines = currentVal ? currentVal.split('\n').length : 0;
    const chars = currentVal.length;

    return {
      detected: isDetected,
      framework: 'MONACO',
      version: 'Code-OSS Web',
      mode: 'java',
      readOnly: false,
      lineCount: lines,
      characterCount: chars,
      adapterReady: isDetected,
      insertionSupported: isDetected,
      containerId: container?.id || 'monaco-workbench',
      domPresent: !!container,
      error: isDetected ? undefined : 'Monaco / VS Code Web editor not found',
      errorCode: isDetected ? undefined : 'EDITOR_NOT_FOUND',
    };
  }

  /**
   * Indentation-safe, atomic, zero-duplication code replacement engine.
   * Priority 1: Direct Monaco Model pushEditOperations (Atomic, zero auto-indent, preserves undo)
   * Priority 2: Active Monaco Editor executeEdits
   * Priority 3: Awaited selectAll + Synthetic ClipboardEvent('paste') on inputarea (Zero staircase, zero clipboard modals, preserves undo)
   * Priority 4: document.execCommand fallback
   * Self-Healing Guard: Detects and heals accidental duplicates
   */
  public async insertText(code: string, mode: InsertionMode = 'replace'): Promise<InsertionResult> {
    const textarea = this.getActiveTextarea();
    if (!textarea) {
      return {
        success: false,
        error: 'Monaco inputarea textarea not located.',
        errorCode: 'INPUT_AREA_MISSING',
      };
    }

    const cleanCode = (code || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const win = window as any;
    const initialLen = this.getValue().length;
    const monaco = this.getMonaco();

    // 1. First Priority: Direct Monaco Model pushEditOperations (Zero staircase indentation, preserves undo, atomic)
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          const activeTab = this.getActiveTab();
          let targetModel = null;
          if (activeTab) {
            const cleanActive = this.normalizeName(activeTab);
            const cleanNoExt = cleanActive.replace(/\.[a-z0-9]+$/i, '');
            targetModel = models.find((m: any) => {
              const p = this.normalizeName(m.uri?.path || m.uri?.toString() || '');
              return p === cleanActive || p.replace(/\.[a-z0-9]+$/i, '') === cleanNoExt;
            });
          }
          if (!targetModel && models.length === 1) {
            targetModel = models[0];
          }
          if (targetModel) {
            const range = mode === 'replace' ? targetModel.getFullModelRange() : null;
            if (mode === 'replace' && range) {
              targetModel.pushEditOperations(
                [],
                [{ range, text: cleanCode }],
                () => null
              );
              return {
                success: true,
                method: 'monaco-model-pushEditOperations',
                mode,
                initialLength: initialLen,
                newLength: cleanCode.length,
                lines: cleanCode.split('\n').length,
                verified: true,
              };
            }
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] Monaco direct pushEditOperations warning:', e);
      }
    }

    // 2. Second Priority: Active Editor executeEdits
    if (monaco && typeof monaco.editor?.getEditors === 'function') {
      try {
        const editors = monaco.editor.getEditors();
        const ed = editors.find((e: any) => e.hasTextFocus?.()) || editors[0];
        if (ed && typeof ed.getModel === 'function') {
          const m = ed.getModel();
          if (mode === 'replace') {
            ed.executeEdits('codemate', [
              { range: m.getFullModelRange(), text: cleanCode, forceMoveMarkers: true },
            ]);
            return {
              success: true,
              method: 'monaco-editor-executeEdits',
              mode,
              initialLength: initialLen,
              newLength: cleanCode.length,
              lines: cleanCode.split('\n').length,
              verified: true,
            };
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] Editor executeEdits warning:', e);
      }
    }

    // 3. Third Priority: Synchronized Native Select-All + Synthetic Paste (Zero Staircase, Zero Duplication, Preserves Undo)
    textarea.focus();
    if (mode === 'replace') {
      if (win.workbench?.commands?.executeCommand) {
        try {
          await win.workbench.commands.executeCommand('editor.action.selectAll');
          // Allow microtask tick for selection to register in Monaco's state
          await new Promise((r) => setTimeout(r, 60));
        } catch (e) {
          console.warn('[CodeMate AI] selectAll command warning:', e);
        }
      } else {
        try {
          document.execCommand('selectAll', false);
          await new Promise((r) => setTimeout(r, 40));
        } catch {}
      }
    }

    // Dispatch synthetic paste event directly into Monaco's inputarea
    let pasteSucceeded = false;
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', cleanCode);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      pasteSucceeded = textarea.dispatchEvent(pasteEvent);
      await new Promise((r) => setTimeout(r, 80));
    } catch (pasteErr) {
      console.warn('[CodeMate AI] Synthetic paste dispatch warning:', pasteErr);
    }

    // 4. Fourth Priority Fallback: document.execCommand('insertText')
    const currentVal = this.getValue();
    const isPasteApplied = currentVal.includes(cleanCode.slice(0, Math.min(60, cleanCode.length)));

    if (!isPasteApplied) {
      try {
        if (mode === 'replace') {
          document.execCommand('selectAll', false);
        }
        document.execCommand('insertText', false, cleanCode);
        await new Promise((r) => setTimeout(r, 60));
      } catch {}
    }

    // Post-insertion Deduplication & Verification Guard:
    // If the file was accidentally duplicated, detect and heal with single clean copy!
    await this.deduplicateEditorContent(cleanCode);

    const finalVal = this.getValue();
    return {
      success: true,
      method: pasteSucceeded ? 'monaco-synthetic-paste' : 'execCommand-insertText',
      mode,
      initialLength: initialLen,
      newLength: finalVal.length,
      lines: cleanCode.split('\n').length,
      verified: true,
    };
  }

  /**
   * Self-Healing Deduplication Guard:
   * Inspects editor contents and heals duplicate class/package declarations into a single pristine copy.
   */
  private async deduplicateEditorContent(expectedCode: string): Promise<void> {
    const val = this.getValue();
    if (!val || !expectedCode) return;

    // Check if the file contains duplicate package or class definitions
    const packageMatches = val.match(/package\s+[a-zA-Z0-9_\.]+;/g);
    const hasDuplicatePackage = packageMatches && packageMatches.length >= 2;

    const classMatches = val.match(/(?:public\s+)?class\s+[A-Za-z0-9_]+/g);
    const hasDuplicateClass = classMatches && classMatches.length >= 2 && classMatches[0] === classMatches[1];

    if (hasDuplicatePackage || hasDuplicateClass) {
      console.warn('[CodeMate AI] Detected duplicate code block in editor! Healing editor with single copy...');
      const monaco = this.getMonaco();
      if (monaco && typeof monaco.editor?.getModels === 'function') {
        try {
          const models = monaco.editor.getModels();
          const activeTab = this.getActiveTab();
          const target = models.find((m: any) => {
            const p = this.normalizeName(m.uri?.path || m.uri?.toString() || '');
            return activeTab && this.normalizeName(activeTab) === p;
          }) || models[0];
          if (target) {
            target.setValue(expectedCode);
            return;
          }
        } catch {}
      }

      const win = window as any;
      if (win.workbench?.commands?.executeCommand) {
        try {
          await win.workbench.commands.executeCommand('editor.action.selectAll');
          await new Promise((r) => setTimeout(r, 50));
          const dt = new DataTransfer();
          dt.setData('text/plain', expectedCode);
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          });
          this.getActiveTextarea()?.dispatchEvent(pasteEvent);
        } catch {}
      }
    }
  }

  public undo(): boolean {
    const win = window as unknown as VsCodeWindow;
    if (win.workbench?.commands?.executeCommand) {
      win.workbench.commands.executeCommand('undo');
      return true;
    }
    return false;
  }

  public redo(): boolean {
    const win = window as unknown as VsCodeWindow;
    if (win.workbench?.commands?.executeCommand) {
      win.workbench.commands.executeCommand('redo');
      return true;
    }
    return false;
  }

  // ==========================================
  // MULTI-FILE WORKSPACE ORCHESTRATION METHODS
  // ==========================================

  public normalizeName(name: string): string {
    let raw = name || '';
    try {
      raw = decodeURIComponent(raw);
    } catch {}
    let clean = raw
      .split('/')
      .pop()
      ?.split('\\')
      .pop()
      ?.trim() || '';

    // Remove aria-label ", tab"
    clean = clean.replace(/,\s*tab\s*$/i, '');
    // Remove dirty dot indicator
    clean = clean.replace(/[\u25cf\u2022\*\.]\s*$/g, '');
    // Remove close button symbol (×, ✕, ✖, ⨉) - preserve literal letters 'x' / 'X'
    clean = clean.replace(/[\u00d7\u2715\u2716\u2a09]\s*$/g, '');
    // Replace non-standard whitespace
    clean = clean.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
    return clean.trim().toLowerCase();
  }

  public getDisplayName(name: string): string {
    let clean = (name || '')
      .split('/')
      .pop()
      ?.split('\\')
      .pop()
      ?.trim() || '';

    clean = clean.replace(/,\s*tab\s*$/i, '');
    clean = clean.replace(/[\u25cf\u2022\*\.]\s*$/g, '');
    clean = clean.replace(/[\u00d7\u2715\u2716\u2a09x]\s*$/i, '');
    clean = clean.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
    return clean.trim();
  }

  public getOpenTabs(): WorkspaceTabInfo[] {
    const tabNodes = Array.from(document.querySelectorAll('.tabs-container .tab')) as HTMLElement[];
    return tabNodes
      .map((tab) => {
        const labelEl = tab.querySelector('.label-name, .tab-label') as HTMLElement | null;
        const rawName =
          labelEl?.innerText?.trim() ||
          tab.getAttribute('aria-label') ||
          tab.getAttribute('title') ||
          '';
        const fileName = this.normalizeName(rawName);
        const displayName = this.getDisplayName(rawName);
        const isActive =
          tab.classList.contains('active') ||
          tab.getAttribute('aria-selected') === 'true' ||
          tab.classList.contains('tab-selected');
        return {
          fileName,
          displayName,
          isActive,
          element: tab,
        };
      })
      .filter((t) => t.fileName.length > 0);
  }

  public getActiveTab(): string | null {
    // 1. Check open tabs
    const tabs = this.getOpenTabs();
    const active = tabs.find((t) => t.isActive);
    if (active) return active.displayName || active.fileName;

    // 2. Check breadcrumbs (e.g. demo > src > ... > Student.java)
    const breadcrumbItems = Array.from(
      document.querySelectorAll('.monaco-breadcrumb-item, .breadcrumbs-container .monaco-breadcrumb-item')
    ) as HTMLElement[];
    if (breadcrumbItems.length > 0) {
      const last = breadcrumbItems[breadcrumbItems.length - 1];
      const text = last?.innerText?.trim();
      if (text && /\.[a-z0-9]+$/i.test(text)) {
        return this.getDisplayName(text);
      }
    }

    return null;
  }

  public async switchTab(fileName: string): Promise<boolean> {
    const targetClean = this.normalizeName(fileName);
    if (!targetClean) return false;

    const tabs = this.getOpenTabs();

    // 1. Exact match with extension (e.g. "studentservice.java" === "studentservice.java")
    let target = tabs.find((t) => t.fileName === targetClean);

    // 2. Exact match without extension (e.g. "studentservice" === "studentservice")
    if (!target) {
      const targetNoExt = targetClean.replace(/\.[a-z0-9]+$/i, '');
      target = tabs.find((t) => t.fileName.replace(/\.[a-z0-9]+$/i, '') === targetNoExt);
    }

    if (!target) return false;
    if (target.isActive) return true;

    const tabEl = target.element;
    const clickTarget = (tabEl.querySelector('.label-name, .tab-label, .monaco-icon-label') as HTMLElement) || tabEl;

    // Scroll into view if overflowed
    try {
      tabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {}

    const rect = clickTarget.getBoundingClientRect();
    const x = rect.left > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect.top > 0 ? rect.top + rect.height / 2 : 100;
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    };

    // Clean single sequence on target
    clickTarget.dispatchEvent(new PointerEvent('pointerdown', opts));
    clickTarget.dispatchEvent(new MouseEvent('mousedown', opts));
    clickTarget.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
    clickTarget.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
    clickTarget.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0 }));
    try { clickTarget.click(); } catch {}
    try { tabEl.click(); } catch {}

    // Wait and verify active status (poll up to 500ms)
    const start = Date.now();
    while (Date.now() - start < 500) {
      if (tabEl.classList.contains('active') || tabEl.getAttribute('aria-selected') === 'true') {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    return tabEl.classList.contains('active') || tabEl.getAttribute('aria-selected') === 'true';
  }

  public getWorkspaceFiles(): WorkspaceTreeFile[] {
    const rows = Array.from(document.querySelectorAll('.monaco-list-row')) as HTMLElement[];
    return rows.map((r) => {
      const rawName = (r.getAttribute('aria-label') || r.innerText.trim()).split(' ')[0];
      const name = this.normalizeName(rawName);
      const iconLabel = r.querySelector('.monaco-icon-label');
      const fullPath = iconLabel?.getAttribute('aria-label') || undefined;
      const isFolder =
        r.classList.contains('expanded') ||
        r.classList.contains('collapsed') ||
        r.getAttribute('aria-expanded') !== null;
      const level = parseInt(r.getAttribute('aria-level') || '1', 10);
      return {
        name,
        fullPath,
        isFolder,
        level,
        element: r,
      };
    });
  }

  public async openWorkspaceFile(fileName: string): Promise<boolean> {
    const targetClean = this.normalizeName(fileName);
    const openTabs = this.getOpenTabs();
    if (
      openTabs.some(
        (t) =>
          t.fileName === targetClean ||
          t.fileName.replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, '')
      )
    ) {
      const switched = await this.switchTab(fileName);
      if (switched) return true;
      // If switchTab failed to activate, fall through to tree search below
    }

    const files = this.getWorkspaceFiles();
    const targetNoExt = targetClean.replace(/\.[a-z0-9]+$/i, '');
    const target = files.find(
      (f) =>
        !f.isFolder &&
        (f.name === targetClean || f.name.replace(/\.[a-z0-9]+$/i, '') === targetNoExt)
    );
    if (!target) return false;

    const targetEl = (target.element.querySelector('.monaco-icon-label') as HTMLElement) || target.element;
    try {
      targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {}

    const rect = targetEl.getBoundingClientRect();
    const x = rect.left > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect.top > 0 ? rect.top + rect.height / 2 : 100;
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    };

    // Double-click sequence to open in editor tab from tree
    targetEl.dispatchEvent(new PointerEvent('pointerdown', opts));
    targetEl.dispatchEvent(new MouseEvent('mousedown', opts));
    targetEl.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
    targetEl.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
    targetEl.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0 }));

    targetEl.dispatchEvent(new PointerEvent('pointerdown', opts));
    targetEl.dispatchEvent(new MouseEvent('mousedown', opts));
    targetEl.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
    targetEl.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
    targetEl.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0 }));
    targetEl.dispatchEvent(new MouseEvent('dblclick', { ...opts, buttons: 0 }));
    try { targetEl.click(); } catch {}

    await new Promise((resolve) => setTimeout(resolve, 350));
    return true;
  }

  public async harvestAllOpenFiles(): Promise<Record<string, string>> {
    // 1. Direct Monaco model harvest if accessible
    const monaco = this.getMonaco();
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          const files: Record<string, string> = {};
          for (const m of models) {
            const rawPath = m.uri?.path || m.uri?.toString() || '';
            const baseName = rawPath.split('/').pop() || '';
            if (/\.(java|xml|properties|json|cpp|py|c|h|hpp|cs|ts|js|html|css)$/i.test(baseName)) {
              const val = m.getValue();
              if (val && val.trim().length > 0) {
                files[baseName] = val;
              }
            }
          }
          if (Object.keys(files).length > 0) {
            return files;
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] Monaco direct model harvest failed, falling back to tab switching:', e);
      }
    }

    // 2. Fallback: DOM tab switching
    const fileBundle: Record<string, string> = {};
    const tabs = this.getOpenTabs();
    const originalTab = this.getActiveTab();

    for (const tab of tabs) {
      const switched = await this.switchTab(tab.fileName);
      if (switched) {
        const code = this.getValue();
        if (code && code.trim().length > 0) {
          fileBundle[tab.displayName || tab.fileName] = code;
        }
      }
    }

    // Restore active tab to original
    if (originalTab) {
      await this.switchTab(originalTab);
    }

    return fileBundle;
  }

  public async applyMultiFileUpdates(
    updates: Record<string, string> | Array<{ filename?: string; fileName?: string; code?: string }>
  ): Promise<{ success: boolean; updatedFiles: string[] }> {
    const updatedFiles: string[] = [];

    // Normalize updates to clean Record<string, string>
    const fileMap: Record<string, string> = {};
    if (Array.isArray(updates)) {
      for (const item of updates) {
        const name = item.filename || item.fileName || (item as any).name;
        if (name && item.code) {
          fileMap[name] = item.code;
        }
      }
    } else if (typeof updates === 'object' && updates !== null) {
      for (const [k, v] of Object.entries(updates)) {
        if (typeof v === 'string') {
          fileMap[k] = v;
        } else if (v && typeof v === 'object' && (v as any).code) {
          fileMap[(v as any).filename || (v as any).fileName || k] = (v as any).code;
        }
      }
    }

    const monaco = this.getMonaco();

    // 1. First priority: Direct Monaco Model Updates
    // Bypasses keystroke typing, eliminates auto-indent compounding, and preserves undo buffer!
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        for (const [fileName, code] of Object.entries(fileMap)) {
          const targetClean = this.normalizeName(fileName);
          const targetNoExt = targetClean.replace(/\.[a-z0-9]+$/i, '');

          const model = models.find((m: any) => {
            const path = m.uri?.path || m.uri?.toString() || '';
            const name = this.normalizeName(path);
            return name === targetClean || name.replace(/\.[a-z0-9]+$/i, '') === targetNoExt;
          });

          if (model) {
            model.pushEditOperations(
              [],
              [{ range: model.getFullModelRange(), text: code }],
              () => null
            );
            updatedFiles.push(fileName);
          }
        }

        if (updatedFiles.length === Object.keys(fileMap).length) {
          await this.saveAll();
          return { success: true, updatedFiles };
        }
      } catch (e) {
        console.warn('[CodeMate AI] Direct Monaco model update failed, falling back to UI tab switching:', e);
      }
    }

    // 2. High-precision DOM Tab Switching Fallback for remaining files
    const remainingFiles = Object.entries(fileMap).filter(([fn]) => !updatedFiles.includes(fn));
    for (const [fileName, code] of remainingFiles) {
      const targetClean = this.normalizeName(fileName);
      let opened = await this.openWorkspaceFile(fileName);
      if (!opened) {
        opened = await this.switchTab(fileName);
      }
      if (!opened) {
        console.warn(`[CodeMate AI] Could not open file tab for update: ${fileName}`);
        continue;
      }

      // Safeguard: Wait for active tab to settle and verify match before inserting
      let activeTab = this.getActiveTab();
      let poll = 0;
      while (poll < 6) {
        if (
          activeTab &&
          (this.normalizeName(activeTab) === targetClean ||
           this.normalizeName(activeTab).replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, ''))
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
        activeTab = this.getActiveTab();
        poll++;
      }

      const activeClean = activeTab ? this.normalizeName(activeTab) : '';
      const isMatch =
        activeClean === targetClean ||
        activeClean.replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, '');

      if (!isMatch) {
        console.error(`[CodeMate AI] SAFETY GUARD: Active editor is '${activeTab}', expected '${fileName}'. Aborting insertion into wrong file to prevent file contamination!`);
        continue;
      }

      const res = await this.insertText(code, 'replace');
      if (res.success) {
        updatedFiles.push(fileName);
      }
    }

    // Save all files
    await this.saveAll();

    return {
      success: updatedFiles.length > 0,
      updatedFiles,
    };
  }

  public async saveAll(): Promise<boolean> {
    const win = window as unknown as VsCodeWindow;
    if (win.workbench?.commands?.executeCommand) {
      try {
        await win.workbench.commands.executeCommand('workbench.action.files.saveAll');
        return true;
      } catch (e) {
        console.warn('[CodeMate AI] saveAll command warning:', e);
      }
    }

    // Fallback: dispatch Ctrl+S keyboard event
    const textarea = this.getActiveTextarea();
    if (textarea) {
      const sEvent = new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
      });
      textarea.dispatchEvent(sEvent);
      return true;
    }
    return false;
  }

  public triggerRun(): boolean {
    const buttons = Array.from(document.querySelectorAll('button'));
    const runBtn = buttons.find((b) => b.innerText.trim() === 'Run');
    if (runBtn) {
      runBtn.click();
      return true;
    }
    return false;
  }

  public triggerSubmit(): boolean {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find((b) => b.innerText.trim() === 'Submit');
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  }
}
