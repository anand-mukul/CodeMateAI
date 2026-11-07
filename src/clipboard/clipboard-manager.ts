import { ClipboardStatus, ClipboardValidationResult } from '../types/clipboard';
import { ClipboardPermissions } from './clipboard-permissions';
import { ClipboardValidator } from './clipboard-validator';
import { CodeMateError } from './clipboard-errors';

export class ClipboardManager {
  /**
   * Queries clipboard permission status safely without reading data
   */
  public static async checkAvailability(): Promise<ClipboardStatus> {
    return ClipboardPermissions.queryStatus();
  }

  /**
   * Backward-compatible alias for checkAvailability
   */
  public static async getPermissionStatus(): Promise<ClipboardStatus> {
    return this.checkAvailability();
  }

  /**
   * User-activated clipboard read.
   * Reads raw string from browser clipboard and validates it.
   * Never logs raw clipboard contents.
   */
  public static async readText(): Promise<ClipboardValidationResult> {
    const hasNavigator = typeof navigator !== 'undefined' && !!navigator.clipboard;
    if (!hasNavigator || typeof navigator.clipboard.readText !== 'function') {
      throw new CodeMateError('CLIPBOARD_UNAVAILABLE');
    }

    let rawText = '';
    try {
      rawText = await navigator.clipboard.readText();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('denied') || msg.includes('permission') || msg.includes('NotAllowedError')) {
        throw new CodeMateError('CLIPBOARD_PERMISSION_DENIED');
      }
      throw new CodeMateError('CLIPBOARD_UNAVAILABLE', msg);
    }

    const validation = ClipboardValidator.validate(rawText);
    if (!validation.isValid) {
      throw new CodeMateError('CLIPBOARD_EMPTY');
    }

    return validation;
  }

  /**
   * User-activated clipboard write.
   * Preserves formatting, indentation, newlines, Unicode, and handles large source files.
   */
  public static async writeText(text: string): Promise<boolean> {
    const hasNavigator = typeof navigator !== 'undefined' && !!navigator.clipboard;
    if (!hasNavigator || typeof navigator.clipboard.writeText !== 'function') {
      throw new CodeMateError('CLIPBOARD_UNAVAILABLE');
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CodeMateError('CLIPBOARD_PERMISSION_DENIED', `Clipboard write failed: ${msg}`);
    }
  }

  /**
   * Copies code snippet to clipboard with error encapsulation
   */
  public static async copyCode(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.writeText(code);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof CodeMateError ? err.userMessage : String(err),
      };
    }
  }

  /**
   * User-activated test read returning ClipboardStatus for diagnostic display
   */
  public static async testRead(): Promise<ClipboardStatus> {
    try {
      const res = await this.readText();
      const snippet = res.text.length > 80 ? res.text.slice(0, 80) + '...' : res.text;

      return {
        permission: 'granted',
        readSupported: true,
        writeSupported: true,
        lastReadLength: res.charCount,
        lastReadSnippet: snippet,
      };
    } catch (err) {
      const code = err instanceof CodeMateError ? err.code : 'CLIPBOARD_UNAVAILABLE';
      const userMsg = err instanceof CodeMateError ? err.userMessage : String(err);

      return {
        permission: code === 'CLIPBOARD_PERMISSION_DENIED' ? 'denied' : 'prompt',
        readSupported: false,
        writeSupported: true,
        error: userMsg,
        errorCode: code,
      };
    }
  }
}
