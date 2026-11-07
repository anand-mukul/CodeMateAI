import { ClipboardStatus, ClipboardPermissionState } from '../types/clipboard';
import { CodeMateError } from './clipboard-errors';

export class ClipboardPermissions {
  /**
   * Queries browser clipboard permission readiness safely.
   */
  public static async queryStatus(): Promise<ClipboardStatus> {
    const hasNavigator = typeof navigator !== 'undefined' && !!navigator.clipboard;
    if (!hasNavigator) {
      return {
        permission: 'unknown',
        readSupported: false,
        writeSupported: false,
        error: CodeMateError.getMessage('CLIPBOARD_UNAVAILABLE'),
        errorCode: 'CLIPBOARD_UNAVAILABLE',
      };
    }

    let permState: ClipboardPermissionState = 'prompt';

    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        const queryResult = await navigator.permissions.query({
          name: 'clipboard-read' as PermissionName,
        });
        permState = queryResult.state as ClipboardPermissionState;
      }
    } catch {
      // Permission query not supported or restricted in some Chrome extension contexts
      permState = 'prompt';
    }

    return {
      permission: permState,
      readSupported: typeof navigator.clipboard.readText === 'function',
      writeSupported: typeof navigator.clipboard.writeText === 'function',
    };
  }
}

