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
  fullPath?: string;
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
    const hasWorkbench = !!document.querySelector('.monaco-workbench');
    const hasMonacoEditor = !!document.querySelector('.monaco-editor');
    // If the page contains an active Ace editor and no monaco workbench, yield to Ace
    if (document.querySelector('.ace_editor') && !hasWorkbench) {
      return false;
    }
    const container = this.getContainer();
    return !!(hasWorkbench || hasMonacoEditor || container);
  }

  public isMultiFileWorkspace(): boolean {
    if (!document.querySelector('.monaco-workbench')) return false;

    const openTabs = document.querySelectorAll('.tabs-container .tab, .tab[role="tab"]');
    if (openTabs.length >= 2) return true;

    // Check if explorer tree has multiple source code files even if unopened in tabs
    const CODE_EXT_REGEX = /\.(java|py|cpp|cc|c|h|hpp|js|jsx|ts|tsx|html|css|json|xml|sql|properties|gradle|kt|swift|rb|go|rs|php)$/i;
    const treeRows = Array.from(document.querySelectorAll('.monaco-list-row')) as HTMLElement[];
    const sourceRows = treeRows.filter((r) => {
      const rawName = (r.getAttribute('aria-label') || r.innerText.trim()).split(' ')[0];
      const name = this.normalizeName(rawName);
      const isFolder =
        r.classList.contains('expanded') ||
        r.classList.contains('collapsed') ||
        r.getAttribute('aria-expanded') !== null;
      return !isFolder && CODE_EXT_REGEX.test(name);
    });

    if (sourceRows.length >= 2) return true;

    // Check if Monaco models already contain multiple source files
    const monaco = this.getMonaco();
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels().filter((m: any) => {
          const p = m.uri?.path || m.uri?.toString() || '';
          return CODE_EXT_REGEX.test(p);
        });
        if (models.length >= 2) return true;
      } catch {}
    }

    // Check if breadcrumbs trail indicates a multi-directory package hierarchy
    const breadcrumbItems = document.querySelectorAll(
      '.breadcrumbs-control .monaco-breadcrumb-item, .monaco-breadcrumbs [role="listitem"]'
    );
    if (breadcrumbItems.length >= 3) return true;

    return false;
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

    // 4. Fourth Priority: Monaco Unvirtualized Native Copy-Capture Protocol
    // Selects entire model (all lines) via Ctrl+A on textarea.inputarea, intercepts synchronous copy dataTransfer,
    // and captures the complete document without DOM virtualization truncation!
    const textarea = this.getActiveTextarea();
    if (textarea) {
      try {
        textarea.focus();
        const selectAllEvt = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          keyCode: 65,
          which: 65,
          ctrlKey: true,
          metaKey: navigator.platform.includes('Mac'),
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        textarea.dispatchEvent(selectAllEvt);

        let capturedFullText: any = null;
        const originalSetData = DataTransfer.prototype.setData;
        DataTransfer.prototype.setData = function (format: string, data: string) {
          if (format.toLowerCase().includes('text')) {
            capturedFullText = data;
          }
          return originalSetData.apply(this, arguments as any);
        };

        try {
          document.execCommand('copy');
        } finally {
          DataTransfer.prototype.setData = originalSetData;
        }

        // Collapse selection back with Escape so view is pristine
        const escEvt = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          bubbles: true,
          cancelable: true,
        });
        textarea.dispatchEvent(escEvt);

        if (typeof capturedFullText === 'string' && capturedFullText.trim().length > 0) {
          return capturedFullText;
        }
      } catch (copyErr) {
        console.warn('[CodeMate AI] Copy-capture unvirtualized read warning:', copyErr);
      }
    }

    // 5. Fifth Priority (Fallback DOM Extraction): View lines with strict vertical sort and non-breaking space replacement
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
          return textFromLines;
        }
      }
    }

    // 6. Sixth Priority: Check active textarea.inputarea value
    if (textarea && textarea.value && textarea.value.trim().length > 0) {
      return textarea.value;
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
   * Priority 1: Direct Monaco Model pushEditOperations targeted by explicit targetFilename or active tab
   * Priority 2: Active Monaco Editor executeEdits
   * Priority 3: DOM SelectAll + Backspace wipe + execCommand('insertText') with buffer rescue
   * Self-Healing Guard: Detects and heals accidental duplicates
   */
  public async insertText(code: string, mode: InsertionMode = 'replace', targetFilename?: string): Promise<InsertionResult> {
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

    // 1. First Priority: Direct Monaco Model (Atomic, zero auto-indent, exact file targeting)
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          let targetModel: any = null;

          // Priority A: Search by explicit targetFilename if provided
          if (targetFilename) {
            targetModel = models.find((m: any) => {
              const rawPath = m.uri?.path || m.uri?.toString() || '';
              return this.isMatchingFile(rawPath, targetFilename);
            });
            if (targetModel) {
              console.log(`[CodeMate AI] Tier-1: Located model for explicit target '${targetFilename}'`);
            }
          }

          // Priority B: Search by active tab (only if targetFilename matches activeTab or no targetFilename specified)
          if (!targetModel && (!targetFilename || (this.getActiveTab() && this.isMatchingFile(this.getActiveTab()!, targetFilename)))) {
            const activeTab = this.getActiveTab();
            if (activeTab) {
              targetModel = models.find((m: any) => {
                const rawPath = m.uri?.path || m.uri?.toString() || '';
                return this.isMatchingFile(rawPath, activeTab);
              });
            }
          }

          // Priority C: If only 1 model in workspace, use it ONLY if no targetFilename or matches targetFilename
          if (!targetModel && models.length === 1) {
            const singlePath = models[0].uri?.path || models[0].uri?.toString() || '';
            if (!targetFilename || this.isMatchingFile(singlePath, targetFilename)) {
              targetModel = models[0];
            }
          }

          if (targetModel) {
            if (mode === 'replace') {
              const range = targetModel.getFullModelRange();
              targetModel.pushEditOperations(
                [],
                [{ range, text: cleanCode }],
                () => null
              );

              // Absolute verification: check if value took hold
              const currentVal = targetModel.getValue();
              if (!currentVal || currentVal.trim().length === 0 || currentVal.trim() !== cleanCode.trim()) {
                // Direct model value assignment guarantee
                if (typeof targetModel.setValue === 'function') {
                  targetModel.setValue(cleanCode);
                }
              }

              const finalLen = targetModel.getValue().length;
              return {
                success: finalLen > 0,
                method: 'monaco-model-pushEditOperations',
                mode,
                initialLength: initialLen,
                newLength: finalLen,
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
        let ed: any = null;
        if (targetFilename) {
          ed = editors.find((e: any) => {
            const m = e.getModel?.();
            const p = m?.uri?.path || m?.uri?.toString() || '';
            return this.isMatchingFile(p, targetFilename);
          });
        }
        if (!ed && !targetFilename) {
          ed = editors.find((e: any) => e.hasTextFocus?.()) || editors[0];
        }

        if (ed && typeof ed.getModel === 'function') {
          const m = ed.getModel();
          if (mode === 'replace') {
            ed.executeEdits('codemate', [
              { range: m.getFullModelRange(), text: cleanCode, forceMoveMarkers: true },
            ]);
            if (m.getValue().trim().length === 0 && typeof m.setValue === 'function') {
              m.setValue(cleanCode);
            }
            return {
              success: m.getValue().length > 0,
              method: 'monaco-editor-executeEdits',
              mode,
              initialLength: initialLen,
              newLength: m.getValue().length,
              lines: cleanCode.split('\n').length,
              verified: true,
            };
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] Editor executeEdits warning:', e);
      }
    }

    // 3. Third Priority: DOM-level Wipe & Insert with Atomic Fallback
    // Safety guard: Ensure active editor tab matches targetFilename before touching DOM
    const curActiveTab = this.getActiveTab();
    if (targetFilename && curActiveTab && !this.isMatchingFile(curActiveTab, targetFilename)) {
      console.error(
        `[CodeMate AI] SAFETY GUARD: Active editor '${curActiveTab}' does not match target '${targetFilename}'. Aborting DOM insertion to prevent file contamination!`
      );
      return {
        success: false,
        error: `Active editor '${curActiveTab}' does not match target '${targetFilename}'`,
        errorCode: 'TARGET_MISMATCH',
        mode,
        initialLength: initialLen,
        newLength: initialLen,
        lines: 0,
        verified: false,
      };
    }

    textarea.focus();
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const selectAllEvt = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      keyCode: 65,
      which: 65,
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    const backspaceEvt = new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      keyCode: 8,
      which: 8,
      bubbles: true,
      cancelable: true,
      composed: true,
    });

    if (mode === 'replace') {
      // Step A: Primary Buffer Wipe via Native VS Code Workbench Commands
      // Tested & verified on live CodeChef: selectAll followed by deleteLeft completely empties Monaco's virtual buffer!
      if (win.workbench?.commands?.executeCommand) {
        try {
          await win.workbench.commands.executeCommand('editor.action.selectAll');
          await new Promise((r) => setTimeout(r, 30));
          await win.workbench.commands.executeCommand('deleteLeft');
          await new Promise((r) => setTimeout(r, 40));
        } catch (e) {
          console.warn('[CodeMate AI] Workbench selectAll + deleteLeft error:', e);
        }
      }

      // Fallback: If buffer still has content, repeat or use Cut command
      if (this.getValue().trim().length > 0) {
        if (win.workbench?.commands?.executeCommand) {
          try {
            await win.workbench.commands.executeCommand('editor.action.selectAll');
            await new Promise((r) => setTimeout(r, 20));
            await win.workbench.commands.executeCommand('editor.action.clipboardCutAction');
            await new Promise((r) => setTimeout(r, 30));
          } catch {}
        }
        if (this.getValue().trim().length > 0) {
          textarea.dispatchEvent(selectAllEvt);
          textarea.dispatchEvent(backspaceEvt);
          try { document.execCommand('delete', false); } catch {}
          await new Promise((r) => setTimeout(r, 30));
        }
      }
    }

    // Step B1: Primary Atomic Insertion via Native Workbench Snippet
    // VS Code's editor.action.insertSnippet inserts code directly into the model buffer
    // without simulating typing through textarea. Zero compounding auto-indent staircase!
    let inserted = false;
    if (win.workbench?.commands?.executeCommand) {
      try {
        textarea.focus();
        // Escape literal '$' for snippet template compatibility ($ is snippet placeholder)
        const safeSnippet = cleanCode.replace(/\\/g, '\\\\').replace(/\$/g, '\\$');
        await win.workbench.commands.executeCommand('editor.action.insertSnippet', { snippet: safeSnippet });
        await new Promise((r) => setTimeout(r, 60));
        if (this.getValue().trim().length > 0) {
          inserted = true;
          console.log('[CodeMate AI] Pristine snippet insertion succeeded.');
        }
      } catch (e) {
        console.warn('[CodeMate AI] Workbench insertSnippet notice:', e);
      }
    }

    // Step B2: Synthetic ClipboardEvent with in-memory DataTransfer
    if (!inserted || this.getValue().trim().length === 0) {
      try {
        textarea.focus();
        const dt = new DataTransfer();
        dt.setData('text/plain', cleanCode);
        const pasteEvt = new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        textarea.dispatchEvent(pasteEvt);
        await new Promise((r) => setTimeout(r, 50));
        if (this.getValue().trim().length > 0) {
          inserted = true;
          console.log('[CodeMate AI] Synthetic paste insertion succeeded.');
        }
      } catch (pasteErr) {
        console.warn('[CodeMate AI] Synthetic paste notice:', pasteErr);
      }
    }

    // Step B3: Standard DOM execCommand('insertText') Fallback
    if (!inserted || this.getValue().trim().length === 0) {
      try {
        textarea.focus();
        inserted = document.execCommand('insertText', false, cleanCode);
        await new Promise((r) => setTimeout(r, 50));
      } catch (insertErr) {
        console.warn('[CodeMate AI] execCommand insertText fallback notice:', insertErr);
      }
    }

    // Step B4: Universal Indentation Normalization Guard
    // Re-indents the document using VS Code's native indentation engine,
    // flattening any residual typing-induced staircase into pristine 4-space code.
    if (win.workbench?.commands?.executeCommand) {
      try {
        await win.workbench.commands.executeCommand('editor.action.selectAll');
        await new Promise((r) => setTimeout(r, 20));
        await win.workbench.commands.executeCommand('editor.action.reindentselectedlines');
        await new Promise((r) => setTimeout(r, 30));
        // Deselect and place cursor at top
        await win.workbench.commands.executeCommand('cursorTop');
      } catch (reindentErr) {
        console.warn('[CodeMate AI] Re-indentation normalizer notice:', reindentErr);
      }
    }

    // Save all files so changes are immediately persisted in Code-OSS
    if (win.workbench?.commands?.executeCommand) {
      try {
        await win.workbench.commands.executeCommand('workbench.action.files.saveAll');
      } catch {}
    }

    // Step C: Auto-heal missing first letter ('p' dropped from 'package' into 'ackage')
    let curVal = this.getValue();
    let curTrimmed = curVal.trimStart();
    let codeTrimmed = cleanCode.trimStart();
    if (codeTrimmed.startsWith('package ') && (curTrimmed.startsWith('ackage ') || curTrimmed.startsWith('\nackage '))) {
      console.warn('[CodeMate AI] Detected dropped leading character in editor! Auto-healing...');
      try {
        textarea.focus();
        if (win.workbench?.commands?.executeCommand) {
          await win.workbench.commands.executeCommand('cursorHome');
        } else {
          textarea.setSelectionRange(0, 0);
        }
        document.execCommand('insertText', false, 'p');
      } catch {}
    }

    // Post-insertion Deduplication & Verification Guard
    await this.deduplicateEditorContent(cleanCode);

    const finalVal = this.getValue();
    // SUCCESS if: buffer has the new content (non-empty) OR length changed from initial
    const hasContent = finalVal.trim().length > 0;
    const hasChanged = finalVal.length !== initialLen || finalVal.trim() === cleanCode.trim();
    const success = hasContent && (hasChanged || finalVal.trim().length === cleanCode.trim().length);

    return {
      success,
      method: inserted ? 'execCommand-insertText' : 'dom-wipe-paste-fallback',
      mode,
      initialLength: initialLen,
      newLength: finalVal.length,
      lines: cleanCode.split('\n').length,
      verified: success,
      error: success ? undefined : 'Editor buffer is empty after insertion. File may need manual refresh.',
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
      const textarea = this.getActiveTextarea();
      if (textarea) {
        try {
          textarea.focus();
          const isMac = navigator.platform.toUpperCase().includes('MAC');
          const selectAllEvt = new KeyboardEvent('keydown', {
            key: 'a',
            code: 'KeyA',
            keyCode: 65,
            which: 65,
            ctrlKey: !isMac,
            metaKey: isMac,
            bubbles: true,
            cancelable: true,
            composed: true,
          });
          const backspaceEvt = new KeyboardEvent('keydown', {
            key: 'Backspace',
            code: 'Backspace',
            keyCode: 8,
            which: 8,
            bubbles: true,
            cancelable: true,
            composed: true,
          });

          if (win.workbench?.commands?.executeCommand) {
            await win.workbench.commands.executeCommand('editor.action.selectAll');
          }
          textarea.dispatchEvent(selectAllEvt);
          await new Promise((r) => setTimeout(r, 30));

          textarea.dispatchEvent(backspaceEvt);
          try {
            document.execCommand('delete', false);
          } catch {}
          await new Promise((r) => setTimeout(r, 30));

          const dt = new DataTransfer();
          dt.setData('text/plain', expectedCode);
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          });
          textarea.dispatchEvent(pasteEvent);
          await new Promise((r) => setTimeout(r, 50));
        } catch (e) {
          console.warn('[CodeMate AI] deduplicateEditorContent fallback warning:', e);
        }
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

    // Remove aria-label ", tab", ", file", ", Java", etc.
    clean = clean.replace(/,\s*(?:tab|file|java|class|document|folder)?\s*$/i, '');
    clean = clean.replace(/[,;]+$/, '');
    // Remove dirty dot indicator
    clean = clean.replace(/[\u25cf\u2022\*\.]\s*$/g, '');
    // Remove close button symbol (×, ✕, ✖, ⨉) or whitespace-separated close button 'x'/'X'
    clean = clean.replace(/[\u00d7\u2715\u2716\u2a09]\s*$/g, '');
    clean = clean.replace(/[\s\t]+[xX]$/g, '');
    // Remove non-standard whitespace
    clean = clean.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
    // Strip leading icon font glyphs (Private Use Area & symbols) without eating valid ASCII filename letters!
    clean = clean.replace(/^[\uE000-\uF8FF\u2000-\u2BFF\s]+/, '');
    return clean.trim().toLowerCase();
  }

  public isMatchingFile(a: string, b: string): boolean {
    if (!a || !b) return false;
    const normA = this.normalizeName(a);
    const normB = this.normalizeName(b);
    if (normA === normB) return true;

    // Direct comparison of normalized basenames
    const baseA = normA.split('/').pop()?.split('\\').pop() || normA;
    const baseB = normB.split('/').pop()?.split('\\').pop() || normB;
    if (baseA === baseB) return true;

    // Path suffix comparison with strict slash separator (e.g. ".../com/example/demo/student.java" vs "demo/student.java")
    const slashA = normA.replace(/\\/g, '/');
    const slashB = normB.replace(/\\/g, '/');
    if (slashA.endsWith('/' + slashB) || slashB.endsWith('/' + slashA)) {
      return true;
    }

    // Extension-less comparison ONLY if one side lacks an extension (e.g. "Student" vs "Student.java")
    const hasExtA = /\.[a-z0-9]+$/i.test(baseA);
    const hasExtB = /\.[a-z0-9]+$/i.test(baseB);
    if (hasExtA !== hasExtB) {
      const noExtA = baseA.replace(/\.[a-z0-9]+$/i, '');
      const noExtB = baseB.replace(/\.[a-z0-9]+$/i, '');
      if (noExtA && noExtB && noExtA === noExtB) return true;
    }

    return false;
  }

  public getDisplayName(name: string): string {
    let clean = (name || '')
      .split('/')
      .pop()
      ?.split('\\')
      .pop()
      ?.trim() || '';

    clean = clean.replace(/,\s*tab\s*$/i, '');
    clean = clean.replace(/[\u25cf\u2022\*]\s*$/g, '');
    clean = clean.replace(/[\u00d7\u2715\u2716\u2a09]\s*$/g, '');
    clean = clean.replace(/[\s\t]+[xX]$/g, '');
    clean = clean.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
    clean = clean.replace(/^[\uE000-\uF8FF\u2000-\u2BFF\s]+/, '');
    return clean.trim();
  }

  public getOpenTabs(): WorkspaceTabInfo[] {
    // 1. Strict editor tabs scoping: only query inside .part.editor / .editor-group-container
    let tabNodes: HTMLElement[] = [];

    const editorGroupTabs = Array.from(
      document.querySelectorAll(
        '.part.editor .tabs-container .tab, .editor-group-container .tabs-container .tab'
      )
    ) as HTMLElement[];

    if (editorGroupTabs.length > 0) {
      tabNodes = editorGroupTabs;
    } else {
      const wideTabs = Array.from(
        document.querySelectorAll('.tabs-and-actions-container .tab, .tabs-container .tab')
      ) as HTMLElement[];
      tabNodes = wideTabs;
    }

    if (tabNodes.length === 0) {
      tabNodes = Array.from(
        document.querySelectorAll('.tab[role="tab"], [role="tablist"] [role="tab"]')
      ).filter((el) => {
        return !el.closest('.part.activitybar, .part.panel, .part.statusbar, #activitybar, .part.sidebar, .pane-header');
      }) as HTMLElement[];
    }

    // Safety: exclude anything outside .part.editor if .part.editor is present
    const editorPart = document.querySelector('.part.editor');
    if (editorPart && tabNodes.length > 0) {
      const strictlyInside = tabNodes.filter((el) => editorPart.contains(el));
      if (strictlyInside.length > 0) {
        tabNodes = strictlyInside;
      }
    }

    const seen = new Set<string>();
    const result: WorkspaceTabInfo[] = [];
    const CODE_EXT_REGEX = /\.(java|py|cpp|cc|c|h|hpp|js|jsx|ts|tsx|html|css|json|xml|sql|txt|md|properties|gradle|kt|swift|rb|go|rs|php)$/i;

    for (const tab of tabNodes) {
      const resourceName = tab.getAttribute('data-resource-name') || '';
      const labelEl = tab.querySelector('.label-name, .tab-label, [class*="label"], [class*="name"]') as HTMLElement | null;
      const rawName =
        resourceName ||
        tab.getAttribute('aria-label') ||
        labelEl?.innerText?.trim() ||
        tab.getAttribute('title') ||
        tab.innerText?.trim() ||
        '';
      const fileName = this.normalizeName(rawName);

      // CRITICAL: Reject tabs that do not have a source code file extension (e.g. explorer, problems, terminal)
      if (!fileName || !CODE_EXT_REGEX.test(fileName) || seen.has(fileName)) continue;
      seen.add(fileName);

      // Extract accurate full relative workspace path from .monaco-icon-label (live CodeChef verified)
      const fullPathRaw = tab.querySelector('.monaco-icon-label')?.getAttribute('aria-label') || '';
      const cleanFullPath = fullPathRaw
        .replace(/^~[\\\/]workspace[\\\/]/i, '')
        .replace(/^~[\\\/]/, '')
        .replace(/^[\\\/]/, '')
        .trim();

      const displayName = resourceName || this.getDisplayName(rawName);
      const isActive =
        tab.classList.contains('active') ||
        tab.getAttribute('aria-selected') === 'true' ||
        tab.classList.contains('tab-selected') ||
        (tab.className && (tab.className.includes('active') || tab.className.includes('selected'))) ||
        tab.getAttribute('data-active') === 'true';

      result.push({
        fileName,
        displayName,
        fullPath: cleanFullPath || undefined,
        isActive,
        element: tab,
      });
    }

    return result;
  }

  public getActiveTab(): string | null {
    // 1. First Priority: Check Breadcrumbs trail (In CodeChef, the breadcrumb trail is always accurate and visible!)
    const breadcrumbItems = Array.from(
      document.querySelectorAll(
        '.monaco-breadcrumbs [role="listitem"], .monaco-breadcrumb-item, .breadcrumbs-container .monaco-breadcrumb-item, [class*="breadcrumb"] [class*="item"], [class*="breadcrumbs"] span, [class*="breadcrumb"]'
      )
    ) as HTMLElement[];

    if (breadcrumbItems.length > 0) {
      for (let i = breadcrumbItems.length - 1; i >= 0; i--) {
        const text = (breadcrumbItems[i]?.innerText || '').trim();
        // Remove leading/trailing breadcrumb separators, dirty indicators, and whitespace without stripping file dots!
        const clean = text.replace(/^[\u25cf\u2022\*\>\/\\\s]+|[\u25cf\u2022\*\>\/\\\s]+$/g, '').trim();
        if (clean && /\.[a-zA-Z0-9]+$/i.test(clean)) {
          return this.getDisplayName(clean);
        }
      }
    }

    // 2. Second Priority: Open Tabs list
    const tabs = this.getOpenTabs();
    const active = tabs.find((t) => t.isActive);
    if (active) return active.displayName || active.fileName;

    // 3. Third Priority: Active textarea aria-label
    const textarea = this.getActiveTextarea();
    if (textarea) {
      const ariaLabel = textarea.getAttribute('aria-label') || '';
      const cleanAria = ariaLabel.replace(/,\s*(editor|tab)\s*$/i, '').trim();
      if (cleanAria && /\.[a-z0-9]+$/i.test(cleanAria)) {
        return cleanAria;
      }
    }

    return null;
  }

  public async switchTab(fileName: string): Promise<boolean> {
    const targetClean = this.normalizeName(fileName);
    if (!targetClean) return false;

    // Check if already on this tab
    const curActive = this.getActiveTab() || '';
    if (this.isMatchingFile(curActive, targetClean)) {
      return true;
    }

    const tabs = this.getOpenTabs();
    const tabIdx = tabs.findIndex(
      (t) => this.isMatchingFile(t.fileName, targetClean)
    );
    const target = tabIdx >= 0 ? tabs[tabIdx] : null;

    // Layer 1: VS Code Native Workbench Command (1-indexed)
    const win = window as any;
    if (win.workbench?.commands?.executeCommand && tabIdx >= 0 && tabIdx < 9) {
      try {
        await win.workbench.commands.executeCommand(`workbench.action.openEditorAtIndex${tabIdx + 1}`);
        await new Promise((r) => setTimeout(r, 150));
        const activeAfterCmd = this.getActiveTab() || '';
        if (this.isMatchingFile(activeAfterCmd, targetClean)) {
          return true;
        }
      } catch (cmdErr) {
        console.warn('[CodeMate AI] openEditorAtIndex warning:', cmdErr);
      }
    }

    // Layer 2: Synthetic Mouse Interaction with proper button and which codes
    if (target) {
      const tabEl = target.element;
      const clickTarget = (tabEl.querySelector('.label-name, .tab-label, .monaco-icon-label') as HTMLElement) || tabEl;

      try {
        tabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {}

      const rect = clickTarget.getBoundingClientRect();
      const x = rect.left > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect.top > 0 ? rect.top + rect.height / 2 : 100;
      const win = tabEl.ownerDocument.defaultView || window;
      const mouseOpts = {
        bubbles: true,
        cancelable: true,
        view: win,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        which: 1,
      };

      const pointerOpts = {
        ...mouseOpts,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      };

      // Dispatch one clean focused event sequence directly to clickTarget
      clickTarget.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
      clickTarget.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      clickTarget.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
      clickTarget.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
      clickTarget.dispatchEvent(new MouseEvent('click', { ...mouseOpts, buttons: 0 }));
      try { clickTarget.click(); } catch {}

      // Wait and verify active status (poll up to 600ms)
      const start = Date.now();
      while (Date.now() - start < 600) {
        const activeTabName = this.normalizeName(this.getActiveTab() || '');
        if (
          tabEl.classList.contains('active') ||
          tabEl.getAttribute('aria-selected') === 'true' ||
          activeTabName === targetClean ||
          activeTabName.replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, '')
        ) {
          await new Promise((resolve) => setTimeout(resolve, 80));
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
    }

    // Layer 3: Breadcrumbs Picker Fallback (for unopened sibling files)
    const openedFromBreadcrumbs = await this.openFileViaBreadcrumbs(fileName);
    if (openedFromBreadcrumbs) {
      await new Promise((r) => setTimeout(r, 200));
      const finalActive = this.normalizeName(this.getActiveTab() || '');
      if (
        finalActive === targetClean ||
        finalActive.replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, '')
      ) {
        return true;
      }
    }

    // Layer 4: Workspace Explorer Tree Fallback
    console.warn(`[CodeMate AI] Direct tab click did not activate ${fileName}, falling back to Explorer tree...`);
    const openedFromTree = await this.openWorkspaceFile(fileName);
    if (openedFromTree) {
      await new Promise((r) => setTimeout(r, 200));
      const finalActive = this.normalizeName(this.getActiveTab() || '');
      return (
        finalActive === targetClean ||
        finalActive.replace(/\.[a-z0-9]+$/i, '') === targetClean.replace(/\.[a-z0-9]+$/i, '')
      );
    }

    return false;
  }

  private dispatchDomClick(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    const x = rect.left > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect.top > 0 ? rect.top + rect.height / 2 : 100;
    const win = el.ownerDocument?.defaultView || window;
    const mouseOpts = { bubbles: true, cancelable: true, view: win, clientX: x, clientY: y, button: 0, buttons: 1, which: 1 };
    const pointerOpts = { ...mouseOpts, pointerId: 1, pointerType: 'mouse', isPrimary: true };

    el.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
    el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...pointerOpts, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('click', { ...mouseOpts, buttons: 0 }));
    try { el.click(); } catch {}
  }

  private closeBreadcrumbsPicker(): void {
    const esc = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(esc);
    document.dispatchEvent(esc);
    (document.activeElement as HTMLElement | null)?.dispatchEvent?.(esc);
  }

  private getRowFileName(row: HTMLElement): string {
    const labelEl = row.querySelector('.label-name, .monaco-icon-label-name, .monaco-icon-label') as HTMLElement | null;
    const rawText = labelEl?.innerText?.trim() || row.getAttribute('aria-label')?.split(',')[0]?.trim() || row.innerText?.trim() || '';
    return this.normalizeName(rawText);
  }

  /**
   * Opens an unopened sibling file via the VS Code breadcrumbs picker dropdown.
   */
  public async openFileViaBreadcrumbs(fileName: string): Promise<boolean> {
    const targetClean = this.normalizeName(fileName);
    if (!targetClean) return false;

    const curActive = this.normalizeName(this.getActiveTab() || '');
    if (this.isMatchingFile(curActive, targetClean)) return true;

    const breadcrumbItems = Array.from(
      document.querySelectorAll(
        '.breadcrumbs-control .monaco-breadcrumb-item, .monaco-breadcrumbs [role="listitem"], .monaco-breadcrumb-item'
      )
    ) as HTMLElement[];
    if (breadcrumbItems.length === 0) return false;

    const trigger = breadcrumbItems[breadcrumbItems.length - 1];
    this.dispatchDomClick(trigger);
    await new Promise((r) => setTimeout(r, 150));

    let picker = document.querySelector('.monaco-breadcrumbs-picker');
    if (!picker && breadcrumbItems.length >= 2) {
      const folderTrigger = breadcrumbItems[breadcrumbItems.length - 2];
      this.dispatchDomClick(folderTrigger);
      await new Promise((r) => setTimeout(r, 150));
      picker = document.querySelector('.monaco-breadcrumbs-picker');
    }

    if (!picker) return false;

    const rows = Array.from(picker.querySelectorAll('.monaco-list-row')) as HTMLElement[];
    let targetRow: HTMLElement | null = null;
    for (const r of rows) {
      const rName = this.getRowFileName(r);
      if (this.isMatchingFile(rName, targetClean)) {
        targetRow = r;
        break;
      }
    }

    if (targetRow) {
      this.dispatchDomClick(targetRow);
      await new Promise((r) => setTimeout(r, 250));
      this.closeBreadcrumbsPicker();
      return true;
    }

    this.closeBreadcrumbsPicker();
    return false;
  }

  /**
   * Auto-discovers and opens unopened sibling source files via VS Code Breadcrumbs picker.
   * Breadcrumbs (.breadcrumbs-control) are located in .part.editor and remain active
   * even when the Explorer sidebar is collapsed (0px width) in CodeChef's split layout.
   */
  public async autoDiscoverViaBreadcrumbs(): Promise<string[]> {
    const CODE_EXT_REGEX = /\.(java|py|cpp|cc|c|h|hpp|js|jsx|ts|tsx|html|css|json|xml|sql|properties|gradle|kt|swift|rb|go|rs|php)$/i;
    const openedFiles: string[] = [];

    const breadcrumbsBar = document.querySelector('.breadcrumbs-control, .monaco-breadcrumbs');
    if (!breadcrumbsBar) return openedFiles;

    const getTrigger = (): HTMLElement | null => {
      const items = Array.from(
        document.querySelectorAll(
          '.breadcrumbs-control .monaco-breadcrumb-item, .monaco-breadcrumbs [role="listitem"], .monaco-breadcrumb-item'
        )
      ) as HTMLElement[];
      return items.length > 0 ? items[items.length - 1] : null;
    };

    // Up to 15 iterations to discover unopened sibling files
    for (let iter = 0; iter < 15; iter++) {
      const openTabs = this.getOpenTabs();
      const openNames = new Set(openTabs.map((t) => this.normalizeName(t.fileName).toLowerCase()));

      const trigger = getTrigger();
      if (!trigger) break;

      this.dispatchDomClick(trigger);
      await new Promise((r) => setTimeout(r, 150));

      const picker = document.querySelector('.monaco-breadcrumbs-picker');
      if (!picker) break;

      const rows = Array.from(picker.querySelectorAll('.monaco-list-row')) as HTMLElement[];
      if (rows.length === 0) {
        this.closeBreadcrumbsPicker();
        await new Promise((r) => setTimeout(r, 60));
        break;
      }

      let unopenedRow: HTMLElement | null = null;
      let unopenedName = '';

      for (const row of rows) {
        const normName = this.getRowFileName(row);
        if (CODE_EXT_REGEX.test(normName) && !openNames.has(normName.toLowerCase())) {
          unopenedRow = row;
          unopenedName = normName;
          break;
        }
      }

      if (!unopenedRow) {
        this.closeBreadcrumbsPicker();
        await new Promise((r) => setTimeout(r, 60));
        break;
      }

      console.log(`[CodeMate AI] Auto-opening sibling project file via breadcrumbs: ${unopenedName}`);
      this.dispatchDomClick(unopenedRow);
      openedFiles.push(unopenedName);
      await new Promise((r) => setTimeout(r, 250));
    }

    this.closeBreadcrumbsPicker();
    return openedFiles;
  }

  public getWorkspaceFiles(): WorkspaceTreeFile[] {
    const rows = Array.from(document.querySelectorAll('.monaco-list-row')) as HTMLElement[];
    return rows.map((r) => {
      const labelNameEl = r.querySelector('.label-name, .monaco-icon-label-name') as HTMLElement | null;
      const labelText = labelNameEl?.innerText?.trim() || '';
      const ariaLabel = r.getAttribute('aria-label') || '';
      const rawText = labelText || ariaLabel.split(',')[0].trim() || r.innerText.trim().split('\n')[0].trim();
      const name = this.normalizeName(rawText);
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
    const CODE_EXT_REGEX = /\.(java|py|cpp|cc|c|h|hpp|js|jsx|ts|tsx|html|css|json|xml|sql|properties|gradle|kt|swift|rb|go|rs|php)$/i;

    // Step 0A: Auto-discover unopened sibling files via Breadcrumbs picker
    // (Crucial for CodeChef where the Explorer sidebar is collapsed to 0px width by default)
    try {
      await this.autoDiscoverViaBreadcrumbs();
    } catch (e) {
      console.warn('[CodeMate AI] Breadcrumbs auto-discovery notice:', e);
    }

    // Step 0B: Check Explorer tree for unopened project files (if Explorer sidebar is open)
    let tabs = this.getOpenTabs();
    let openNames = new Set(tabs.map((t) => this.normalizeName(t.fileName).toLowerCase()));

    const treeFiles = this.getWorkspaceFiles().filter(
      (f) => !f.isFolder && CODE_EXT_REGEX.test(f.name)
    );

    const unopenedTreeFiles = treeFiles.filter((f) => {
      const norm = this.normalizeName(f.name).toLowerCase();
      if (norm.startsWith('.') || norm.endsWith('.log') || norm.endsWith('.xml') || norm.endsWith('.md')) {
        return false;
      }
      return !openNames.has(norm);
    });

    if (unopenedTreeFiles.length > 0) {
      console.log(
        `[CodeMate AI] Auto-discovering ${unopenedTreeFiles.length} unopened workspace files from Explorer tree:`,
        unopenedTreeFiles.map((f) => f.name)
      );
      for (const uf of unopenedTreeFiles) {
        try {
          await this.openWorkspaceFile(uf.name);
          await new Promise((r) => setTimeout(r, 250));
        } catch (err) {
          console.warn(`[CodeMate AI] Failed to auto-open ${uf.name}:`, err);
        }
      }
      tabs = this.getOpenTabs();
      openNames = new Set(tabs.map((t) => this.normalizeName(t.fileName).toLowerCase()));
    }

    // If there is only 1 or 0 open tabs AND no multi-file tree files, strictly return single active file
    if (tabs.length <= 1 && treeFiles.length <= 1) {
      const activeName = this.getActiveTab() || 'main';
      const activeCode = this.getValue();
      return { [activeName]: activeCode };
    }

    const tabNameSet = new Set(tabs.map((t) => this.normalizeName(t.fileName).toLowerCase()));
    const fileBundle: Record<string, string> = {};

    // 1. Direct Monaco model harvest if accessible, filtered strictly by visible open tabs
    const monaco = this.getMonaco();
    if (monaco && typeof monaco.editor?.getModels === 'function') {
      try {
        const models = monaco.editor.getModels();
        if (models && models.length > 0) {
          for (const m of models) {
            const rawPath = m.uri?.path || m.uri?.toString() || '';
            const baseName = rawPath.split('/').pop() || '';
            const normalized = this.normalizeName(baseName).toLowerCase();
            if (tabNameSet.has(normalized)) {
              const val = m.getValue();
              if (val && val.trim().length > 0) {
                fileBundle[baseName] = val;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[CodeMate AI] Monaco direct model harvest failed, falling back to tab switching:', e);
      }
    }

    // 2. Identify any tabs that are missing or empty in fileBundle (e.g. lazy-loaded background tabs)
    const missingTabs = tabs.filter((t) => {
      const norm = this.normalizeName(t.fileName).toLowerCase();
      return !Object.keys(fileBundle).some((k) => this.normalizeName(k).toLowerCase() === norm);
    });

    if (missingTabs.length > 0) {
      const originalTab = this.getActiveTab();
      for (const tab of missingTabs) {
        const switched = await this.switchTab(tab.fileName);
        if (switched) {
          await new Promise((r) => setTimeout(r, 120));
          const code = this.getValue();
          if (code && code.trim().length > 0) {
            const key = tab.fullPath || tab.displayName || tab.fileName;
            fileBundle[key] = code;
          }
        }
      }
      if (originalTab) {
        await this.switchTab(originalTab);
      }
    }

    if (Object.keys(fileBundle).length > 0) {
      return fileBundle;
    }

    return { [this.getActiveTab() || 'main']: this.getValue() };
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
          const model = models.find((m: any) => {
            const path = m.uri?.path || m.uri?.toString() || '';
            return this.isMatchingFile(path, fileName);
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
        if (activeTab && this.isMatchingFile(activeTab, fileName)) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
        activeTab = this.getActiveTab();
        poll++;
      }

      const isMatch = Boolean(activeTab && this.isMatchingFile(activeTab, fileName));

      if (!isMatch) {
        console.error(`[CodeMate AI] SAFETY GUARD: Active editor is '${activeTab}', expected '${fileName}'. Aborting insertion into wrong file to prevent file contamination!`);
        continue;
      }

      const res = await this.insertText(code, 'replace', fileName);
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
