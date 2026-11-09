import { EditorAdapter, EditorStatus, InsertionMode, InsertionResult } from '../types/editor';
import { VsCodeWebAdapter } from './adapters/vscode-web-adapter';
import { AceEditorAdapter } from './adapters/ace-adapter';
import { TextareaEditorAdapter } from './adapters/textarea-adapter';

export class EditorManager {
  private static instance: EditorManager | null = null;
  private activeAdapter: EditorAdapter | null = null;
  private candidateAdapters: EditorAdapter[];

  private constructor() {
    this.candidateAdapters = [
      new AceEditorAdapter('#submit-ide-v2'),
      new VsCodeWebAdapter('.monaco-workbench'),
      new TextareaEditorAdapter(),
    ];
  }

  public static getInstance(): EditorManager {
    if (!EditorManager.instance) {
      EditorManager.instance = new EditorManager();
    }
    return EditorManager.instance;
  }

  /**
   * Scans DOM for available editor adapters and initializes the first matching one
   */
  public resolveAdapter(): EditorAdapter | null {
    // If current adapter still detects its instance, retain it
    if (this.activeAdapter && this.activeAdapter.detect()) {
      return this.activeAdapter;
    }

    // Monaco / VS Code workbench takes explicit precedence if mounted
    const hasMonaco = !!(document.querySelector('.monaco-workbench') || document.querySelector('.monaco-editor'));
    const sortedCandidates = hasMonaco
      ? [...this.candidateAdapters].sort((a) => (a instanceof VsCodeWebAdapter ? -1 : 1))
      : this.candidateAdapters;

    for (const adapter of sortedCandidates) {
      if (adapter.detect()) {
        this.activeAdapter = adapter;
        return this.activeAdapter;
      }
    }

    this.activeAdapter = null;
    return null;
  }

  public getActiveAdapter(): EditorAdapter | null {
    return this.resolveAdapter();
  }

  public getStatus(): EditorStatus {
    const adapter = this.resolveAdapter();
    if (adapter) {
      return adapter.getStatus();
    }

    // Inspect if any editor container exists in DOM even if instance is not yet initialized
    const ideContainer =
      document.querySelector('.monaco-workbench') ||
      document.querySelector('#codechef-code-editor') ||
      document.querySelector('.monaco-editor') ||
      document.querySelector('#submit-ide-v2') ||
      document.querySelector('.ace_editor');
    return {
      detected: false,
      framework: 'UNKNOWN',
      version: null,
      mode: null,
      readOnly: false,
      lineCount: 0,
      characterCount: 0,
      adapterReady: false,
      insertionSupported: false,
      containerId: ideContainer?.id || null,
      domPresent: !!ideContainer,
      error: ideContainer ? 'Editor container mounted; initializing engine...' : 'No editor found on page',
      errorCode: ideContainer ? 'EDITOR_NOT_READY' : 'EDITOR_NOT_FOUND',
    };
  }

  public async insertCode(code: string, mode: InsertionMode = 'cursor', targetFilename?: string): Promise<InsertionResult> {
    const adapter = this.resolveAdapter();
    if (!adapter) {
      return {
        success: false,
        error: "We couldn't detect a supported coding editor. Please refresh the practice page.",
        errorCode: 'EDITOR_NOT_FOUND',
      };
    }
    return await adapter.insertText(code, mode, targetFilename);
  }

  public getValue(): string {
    const adapter = this.resolveAdapter();
    return adapter ? adapter.getValue() : '';
  }

  public focus(): void {
    const adapter = this.resolveAdapter();
    if (adapter) adapter.focus();
  }

  public getSelection(): { start: unknown; end: unknown; text?: string } | null {
    const adapter = this.resolveAdapter();
    return adapter ? adapter.getSelection() : null;
  }

  public undo(): boolean {
    const adapter = this.resolveAdapter();
    return adapter && typeof adapter.undo === 'function' ? adapter.undo() : false;
  }

  public redo(): boolean {
    const adapter = this.resolveAdapter();
    return adapter && typeof adapter.redo === 'function' ? adapter.redo() : false;
  }
}
