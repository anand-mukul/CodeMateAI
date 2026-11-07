import { BaseEditorAdapter } from './base-adapter';
import { EditorStatus, InsertionMode, InsertionResult } from '../../types/editor';

export class TextareaEditorAdapter extends BaseEditorAdapter {
  private selector: string;

  constructor(selector: string = 'textarea#source_code, textarea.editor') {
    super();
    this.selector = selector;
  }

  private getTextarea(): HTMLTextAreaElement | null {
    return document.querySelector(this.selector);
  }

  detect(): boolean {
    return !!this.getTextarea();
  }

  getValue(): string {
    const el = this.getTextarea();
    return el ? el.value : '';
  }

  focus(): void {
    const el = this.getTextarea();
    if (el) el.focus();
  }

  getSelection(): { start: unknown; end: unknown } | null {
    const el = this.getTextarea();
    if (!el) return null;
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  insertText(code: string, mode: InsertionMode = 'cursor'): InsertionResult {
    const el = this.getTextarea();
    if (!el) {
      return { success: false, error: 'Textarea element not found in DOM' };
    }

    const initialLength = el.value.length;
    el.focus();

    try {
      if (mode === 'replace') {
        el.value = code;
      } else {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.setRangeText(code, start, end, 'end');
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        success: true,
        method: 'TEXTAREA_FALLBACK',
        mode,
        initialLength,
        newLength: el.value.length,
        lines: el.value.split('\n').length,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  getStatus(): EditorStatus {
    const el = this.getTextarea();
    if (!el) {
      return {
        detected: false,
        framework: 'TEXTAREA',
        version: null,
        mode: null,
        readOnly: false,
        lineCount: 0,
        characterCount: 0,
        adapterReady: false,
        insertionSupported: false,
        containerId: null,
        domPresent: false,
        error: 'No textarea editor found',
      };
    }

    return {
      detected: true,
      framework: 'TEXTAREA',
      version: 'HTML5 Standard',
      mode: 'plain_text',
      readOnly: el.readOnly,
      lineCount: el.value.split('\n').length,
      characterCount: el.value.length,
      adapterReady: true,
      insertionSupported: true,
      containerId: el.id || null,
      domPresent: true,
    };
  }
}

