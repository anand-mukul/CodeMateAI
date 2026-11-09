import { EditorStatus, InsertionOptions, InsertionResult } from './editor';
import { ProblemContext } from './problem';
import { ClipboardStatus } from './clipboard';

export type ExtensionMessage =
  | { type: 'GET_PAGE_STATUS' }
  | { type: 'GET_EDITOR_STATUS' }
  | { type: 'GET_PROBLEM_INFO' }
  | { type: 'GET_EDITOR_CODE' }
  | { type: 'INSERT_CODE'; payload: InsertionOptions }
  | { type: 'UNDO_EDITOR' }
  | { type: 'REDO_EDITOR' }
  | { type: 'TEST_CLIPBOARD_READ' }
  | { type: 'TRIGGER_RUN' }
  | { type: 'TRIGGER_SUBMIT' }
  | { type: 'TRIGGER_NEXT' }
  | { type: 'GET_RUN_STATUS' }
  | { type: 'OPEN_SIDEPANEL' }
  | { type: 'HARVEST_WORKSPACE' }
  | { type: 'APPLY_MULTIFILE_PATCH'; payload?: { files?: Record<string, string> } }
  | { type: 'SWITCH_TAB'; payload?: { fileName?: string } }
  | { type: 'OPEN_FILE'; payload?: { fileName?: string } }
  | { type: 'PING' };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export type PageStatusResponse = MessageResponse<{
  supported: boolean;
  platform: 'CodeChef' | 'Unknown';
  url: string;
  problem: ProblemContext;
  editor: EditorStatus;
}>;

export type EditorStatusResponse = MessageResponse<EditorStatus>;
export type EditorCodeResponse = MessageResponse<{ code: string; lineCount: number; charCount: number; activeTab?: string | null }>;
export type ProblemInfoResponse = MessageResponse<ProblemContext>;
export type InsertionResponse = MessageResponse<InsertionResult>;
export type ClipboardStatusResponse = MessageResponse<ClipboardStatus>;
