/**
 * CodeMate AI — Standardized Error System
 * Maps technical failure codes to user-friendly instructional messages.
 */

export type CodeMateErrorCode =
  | 'CLIPBOARD_PERMISSION_DENIED'
  | 'CLIPBOARD_EMPTY'
  | 'CLIPBOARD_UNAVAILABLE'
  | 'EDITOR_NOT_FOUND'
  | 'EDITOR_NOT_READY'
  | 'EDITOR_READ_ONLY'
  | 'INSERTION_FAILED'
  | 'REPLACEMENT_CANCELLED'
  | 'BRIDGE_TIMEOUT'
  | 'UNSUPPORTED_PLATFORM'
  | 'UNSUPPORTED_EDITOR'
  | 'UNKNOWN_ERROR';

const ERROR_MESSAGES: Record<CodeMateErrorCode, string> = {
  CLIPBOARD_PERMISSION_DENIED:
    'Clipboard access was denied. Please grant clipboard permissions in your browser or click to activate.',
  CLIPBOARD_EMPTY:
    'The clipboard is empty. Please copy some code first.',
  CLIPBOARD_UNAVAILABLE:
    'Clipboard API is not available in this browser context or insecure connection.',
  EDITOR_NOT_FOUND:
    "We couldn't detect a supported coding editor. Please refresh the practice page and try again.",
  EDITOR_NOT_READY:
    'The editor container is initializing. Please wait a moment and try again.',
  EDITOR_READ_ONLY:
    'The coding editor is currently locked in read-only mode.',
  INSERTION_FAILED:
    'Code insertion failed to update the editor document. Please try again or use manual copy-paste.',
  REPLACEMENT_CANCELLED:
    'Full code replacement was cancelled.',
  BRIDGE_TIMEOUT:
    'Connection to the page editor timed out. Please refresh the page and try again.',
  UNSUPPORTED_PLATFORM:
    'This page does not currently support automated code insertion.',
  UNSUPPORTED_EDITOR:
    'The detected editor framework is not currently supported.',
  UNKNOWN_ERROR:
    'An unexpected error occurred. Please try again.',
};

export class CodeMateError extends Error {
  public readonly code: CodeMateErrorCode;
  public readonly userMessage: string;

  constructor(code: CodeMateErrorCode, customMessage?: string) {
    const message = customMessage || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
    super(message);
    this.name = 'CodeMateError';
    this.code = code;
    this.userMessage = message;
    Object.setPrototypeOf(this, CodeMateError.prototype);
  }

  public static getMessage(code: CodeMateErrorCode): string {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

