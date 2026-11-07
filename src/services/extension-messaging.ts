import {
  ExtensionMessage,
  MessageResponse,
  PageStatusResponse,
  EditorStatusResponse,
  EditorCodeResponse,
  ProblemInfoResponse,
  InsertionResponse,
  ClipboardStatusResponse,
} from '../types/messaging';
import { InsertionOptions } from '../types/editor';

export class ExtensionMessagingService {
  /**
   * Retrieves the currently active browser tab
   */
  public static async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab || null;
      }
      return null;
    } catch (err) {
      console.warn('[CodeMate AI] getActiveTab error:', err);
      return null;
    }
  }

  /**
   * Sends a typed message to the content script on the active tab
   */
  public static async sendMessageToActiveTab<T>(
    message: ExtensionMessage
  ): Promise<MessageResponse<T>> {
    const tab = await this.getActiveTab();
    if (!tab || !tab.id) {
      return { success: false, error: 'No active tab found' };
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, message);
      return response as MessageResponse<T>;
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Could not connect to CodeChef page. Please refresh the page.',
      };
    }
  }

  public static async getPageStatus(): Promise<PageStatusResponse> {
    return this.sendMessageToActiveTab({ type: 'GET_PAGE_STATUS' });
  }

  public static async getEditorStatus(): Promise<EditorStatusResponse> {
    return this.sendMessageToActiveTab({ type: 'GET_EDITOR_STATUS' });
  }

  public static async getEditorCode(): Promise<EditorCodeResponse> {
    return this.sendMessageToActiveTab({ type: 'GET_EDITOR_CODE' });
  }

  public static async getProblemInfo(): Promise<ProblemInfoResponse> {
    return this.sendMessageToActiveTab({ type: 'GET_PROBLEM_INFO' });
  }

  public static async insertCode(options: InsertionOptions): Promise<InsertionResponse> {
    return this.sendMessageToActiveTab({ type: 'INSERT_CODE', payload: options });
  }

  public static async undoEditor(): Promise<MessageResponse<{ success: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'UNDO_EDITOR' });
  }

  public static async redoEditor(): Promise<MessageResponse<{ success: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'REDO_EDITOR' });
  }

  public static async testClipboardRead(): Promise<ClipboardStatusResponse> {
    return this.sendMessageToActiveTab({ type: 'TEST_CLIPBOARD_READ' });
  }

  public static async triggerRun(): Promise<MessageResponse<{ triggered: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'TRIGGER_RUN' });
  }

  public static async triggerSubmit(): Promise<MessageResponse<{ triggered: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'TRIGGER_SUBMIT' });
  }

  public static async triggerNext(): Promise<MessageResponse<{ triggered: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'TRIGGER_NEXT' });
  }

  public static async getRunStatus(): Promise<MessageResponse<{ status: string; details?: string }>> {
    return this.sendMessageToActiveTab({ type: 'GET_RUN_STATUS' });
  }

  public static async harvestWorkspace(): Promise<MessageResponse<Record<string, string>>> {
    return this.sendMessageToActiveTab({ type: 'HARVEST_WORKSPACE' });
  }

  public static async switchTab(fileName: string): Promise<MessageResponse<{ switched: boolean }>> {
    return this.sendMessageToActiveTab({ type: 'SWITCH_TAB', payload: { fileName } });
  }

  public static async applyMultiFilePatch(
    files: Record<string, string>
  ): Promise<MessageResponse<{ success: boolean; updatedFiles: string[] }>> {
    return this.sendMessageToActiveTab({ type: 'APPLY_MULTIFILE_PATCH', payload: { files } });
  }
}
