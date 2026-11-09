export type EditorFramework = 'ACE' | 'MONACO' | 'CODEMIRROR' | 'TEXTAREA' | 'UNKNOWN';

export type InsertionMode = 'cursor' | 'replace' | 'start' | 'end';

export type EditorOperation =
  | 'GET_STATUS'
  | 'GET_VALUE'
  | 'INSERT_AT_CURSOR'
  | 'REPLACE_ALL'
  | 'FOCUS'
  | 'GET_SELECTION'
  | 'UNDO'
  | 'REDO'
  | 'TRIGGER_RUN'
  | 'TRIGGER_SUBMIT'
  | 'GET_RUN_STATUS'
  | 'HARVEST_WORKSPACE'
  | 'APPLY_MULTIFILE_PATCH'
  | 'SWITCH_TAB'
  | 'OPEN_FILE';

export interface EditorStatus {
  detected: boolean;
  framework: EditorFramework;
  version: string | null;
  mode: string | null;
  readOnly: boolean;
  lineCount: number;
  characterCount: number;
  adapterReady: boolean;
  insertionSupported: boolean;
  containerId: string | null;
  domPresent: boolean;
  error?: string;
  errorCode?: string;
}

export interface InsertionOptions {
  code: string;
  mode?: InsertionMode;
  confirmReplace?: boolean;
  targetFile?: string;
}

export interface InsertionResult {
  success: boolean;
  method?: string;
  mode?: InsertionMode;
  initialLength?: number;
  newLength?: number;
  lines?: number;
  verified?: boolean;
  error?: string;
  errorCode?: string;
}

export interface EditorRequest {
  nonce: string;
  operation: EditorOperation;
  payload?: {
    text?: string;
    mode?: InsertionMode;
    confirmReplace?: boolean;
  };
}

export interface EditorResponse<T = unknown> {
  nonce: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface EditorAdapter {
  detect(): boolean;
  getValue(): string;
  insertText(code: string, mode?: InsertionMode, targetFilename?: string): InsertionResult | Promise<InsertionResult>;
  focus(): void;
  getSelection(): { start: unknown; end: unknown; text?: string } | null;
  getStatus(): EditorStatus;
  undo?(): boolean;
  redo?(): boolean;
}
