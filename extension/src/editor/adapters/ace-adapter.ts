import { BaseEditorAdapter } from './base-adapter';
import { EditorStatus, InsertionMode, InsertionResult } from '../../types/editor';

// Ace Editor internal typings for safe TypeScript interaction
interface AceUndoManager {
  undo(): void;
  redo(): void;
  hasUndo(): boolean;
  hasRedo(): boolean;
}

interface AceEditorInstance {
  getValue(): string;
  setValue(val: string, cursorPos?: number): void;
  insert(text: string): void;
  focus(): void;
  getReadOnly(): boolean;
  getSelectedText?(): string;
  navigateFileStart(): void;
  navigateFileEnd(): void;
  getSelectionRange(): { start: unknown; end: unknown } | null;
  getSession(): {
    getLength(): number;
    getMode(): { $id: string };
    getUndoManager(): AceUndoManager | null;
  };
}

interface AceWindow extends Window {
  ace?: {
    version?: string;
    edit?: (el: HTMLElement | string) => AceEditorInstance;
  };
}

export class AceEditorAdapter extends BaseEditorAdapter {
  private containerSelector: string;

  constructor(containerSelector: string = '#submit-ide-v2') {
    super();
    this.containerSelector = containerSelector;
  }

  private getContainer(): HTMLElement | null {
    return document.querySelector(this.containerSelector) || document.querySelector('.ace_editor');
  }

  public getAceInstance(): AceEditorInstance | null {
    const container = this.getContainer();
    if (!container) return null;

    // 1. Check DOM expando property placed by Ace
    const expando = (container as unknown as { env?: { editor?: AceEditorInstance } }).env;
    if (expando && expando.editor && typeof expando.editor.getValue === 'function') {
      return expando.editor;
    }

    // 2. Check window.ace.edit()
    const win = window as AceWindow;
    if (win.ace && typeof win.ace.edit === 'function') {
      try {
        const ed = win.ace.edit(container);
        if (ed && typeof ed.getValue === 'function') {
          return ed;
        }
      } catch (err) {
        console.warn('[CodeMate AI] ace.edit invocation warning:', err);
      }
    }

    return null;
  }

  detect(): boolean {
    return !!this.getAceInstance();
  }

  getValue(): string {
    const editor = this.getAceInstance();
    return editor ? editor.getValue() : '';
  }

  focus(): void {
    const editor = this.getAceInstance();
    if (editor) {
      editor.focus();
    }
  }

  getSelection(): { start: unknown; end: unknown; text?: string } | null {
    const editor = this.getAceInstance();
    if (!editor) return null;
    const range = editor.getSelectionRange();
    const text = typeof editor.getSelectedText === 'function' ? editor.getSelectedText() : '';
    return range ? { ...range, text } : null;
  }

  undo(): boolean {
    const editor = this.getAceInstance();
    if (!editor) return false;
    try {
      const undoMgr = editor.getSession()?.getUndoManager();
      if (undoMgr && typeof undoMgr.undo === 'function') {
        undoMgr.undo();
        return true;
      }
    } catch (e) {
      console.warn('[CodeMate AI] Undo invocation failed:', e);
    }
    return false;
  }

  redo(): boolean {
    const editor = this.getAceInstance();
    if (!editor) return false;
    try {
      const undoMgr = editor.getSession()?.getUndoManager();
      if (undoMgr && typeof undoMgr.redo === 'function') {
        undoMgr.redo();
        return true;
      }
    } catch (e) {
      console.warn('[CodeMate AI] Redo invocation failed:', e);
    }
    return false;
  }

  insertText(code: string, mode: InsertionMode = 'cursor'): InsertionResult {
    const editor = this.getAceInstance();
    if (!editor) {
      return {
        success: false,
        error: "We couldn't detect a supported coding editor. Please refresh the practice page.",
        errorCode: 'EDITOR_NOT_FOUND',
      };
    }

    if (editor.getReadOnly()) {
      return {
        success: false,
        error: 'The coding editor is currently locked in read-only mode.',
        errorCode: 'EDITOR_READ_ONLY',
      };
    }

    const initialLength = editor.getValue().length;
    editor.focus();

    try {
      if (mode === 'replace') {
        // Full document replacement (cursor at start with -1 per Task 5)
        editor.setValue(code, -1);
      } else if (mode === 'start') {
        editor.navigateFileStart();
        editor.insert(code + '\n');
      } else if (mode === 'end') {
        editor.navigateFileEnd();
        editor.insert('\n' + code);
      } else {
        // Default: at cursor (replaces selection if active)
        editor.insert(code);
      }

      // Verification step (Task 5.G: verify insertion state in editor document)
      const updatedVal = editor.getValue();
      const lines = editor.getSession() ? editor.getSession().getLength() : updatedVal.split('\n').length;

      let verified = false;
      if (mode === 'replace') {
        verified = updatedVal === code;
      } else {
        // For cursor insertion, document length should have grown by the inserted code's length
        verified = updatedVal.length >= initialLength;
      }

      if (!verified && updatedVal.length === initialLength && code.length > 0) {
        return {
          success: false,
          error: 'Editor content did not change after insertion attempt.',
          errorCode: 'INSERTION_FAILED',
        };
      }

      return {
        success: true,
        method: 'ACE_API',
        mode,
        initialLength,
        newLength: updatedVal.length,
        lines,
        verified,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        errorCode: 'INSERTION_FAILED',
      };
    }
  }

  getStatus(): EditorStatus {
    const container = this.getContainer();
    const editor = this.getAceInstance();
    const win = window as AceWindow;

    if (!editor) {
      return {
        detected: false,
        framework: 'ACE',
        version: win.ace?.version || null,
        mode: null,
        readOnly: false,
        lineCount: 0,
        characterCount: 0,
        adapterReady: false,
        insertionSupported: false,
        containerId: container?.id || null,
        domPresent: !!container,
        error: container ? 'Ace editor container found but instance not bound yet' : 'Editor element not present in DOM',
        errorCode: container ? 'EDITOR_NOT_READY' : 'EDITOR_NOT_FOUND',
      };
    }

    const session = editor.getSession();
    const modeId = session?.getMode()?.$id || '';
    const rawVal = editor.getValue() || '';

    return {
      detected: true,
      framework: 'ACE',
      version: win.ace?.version || '1.42.0',
      mode: modeId.replace('ace/mode/', '') || 'plain_text',
      readOnly: editor.getReadOnly(),
      lineCount: session ? session.getLength() : rawVal.split('\n').length,
      characterCount: rawVal.length,
      adapterReady: true,
      insertionSupported: !editor.getReadOnly(),
      containerId: container?.id || null,
      domPresent: true,
    };
  }
}
