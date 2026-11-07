export type ClipboardPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface ClipboardStatus {
  permission: ClipboardPermissionState;
  readSupported: boolean;
  writeSupported: boolean;
  lastReadLength?: number;
  lastReadSnippet?: string;
  error?: string;
  errorCode?: string;
}

export interface ClipboardValidationResult {
  isValid: boolean;
  text: string;
  charCount: number;
  lineCount: number;
  detectedLanguage: string;
  error?: string;
  errorCode?: string;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  lineCount: number;
  charCount: number;
  createdAt: number;
  isPredefined?: boolean;
}
