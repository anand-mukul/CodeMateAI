/**
 * CodeMate AI — Versioned Secure Storage Service (services/storage.ts)
 * 
 * Manages chrome.storage.local with versioned migrations, schema validation,
 * corruption fallbacks, activity history logging, and full local data purging.
 * 
 * NEVER stores API keys or authorization secrets.
 */

export type AIMode = 'managed' | 'byok' | 'free';

export interface UserSettings {
  version: number;
  backendUrl: string;
  activeProvider: string;
  aiMode: AIMode;
  selectedModel: string;
  byokVault: Record<string, string>;
  safeWorkflowEnabled: boolean;
  actionCooldownSeconds: number;
  lastUpdated: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  action: 'GENERATE' | 'OPTIMIZE' | 'EXPLAIN' | 'ANALYZE' | 'REPLACE_EDITOR' | 'FIX_CODE';
  problemTitle: string;
  language: string;
  status: 'SUCCESS' | 'CANCELLED' | 'ERROR';
  details?: string;
}

const SETTINGS_KEY = 'codemate_settings_v2';
const LEGACY_SETTINGS_KEY = 'codemate_settings_v1';
const ACTIVITY_KEY = 'codemate_activity_v1';
const LEGACY_SNIPPETS_KEY = 'codemate_saved_snippets';

const DEFAULT_SETTINGS: UserSettings = {
  version: 2,
  backendUrl: (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, ''),
  activeProvider: 'gemini',
  aiMode: 'managed',
  selectedModel: 'gemini-3.5-flash',
  byokVault: {},
  safeWorkflowEnabled: true,
  actionCooldownSeconds: 3,
  lastUpdated: Date.now(),
};

export class StorageService {
  private static memorySettings: UserSettings = { ...DEFAULT_SETTINGS };
  private static memoryActivity: ActivityEntry[] = [];

  /**
   * Validates and normalizes target backend URLs
   */
  public static sanitizeBackendUrl(url: string): string {
    const trimmed = (url || '').trim();
    if (!trimmed) return DEFAULT_SETTINGS.backendUrl;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return DEFAULT_SETTINGS.backendUrl;
      }
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return DEFAULT_SETTINGS.backendUrl;
    }
  }

  /**
   * Loads user settings with version migration and corruption fallback
   */
  public static async getSettings(): Promise<UserSettings> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([SETTINGS_KEY, LEGACY_SETTINGS_KEY], (res) => {
          const raw = res[SETTINGS_KEY] || res[LEGACY_SETTINGS_KEY];
          if (!raw || typeof raw !== 'object') {
            resolve({ ...DEFAULT_SETTINGS });
            return;
          }

          const validated: UserSettings = {
            version: 2,
            backendUrl: this.sanitizeBackendUrl(raw.backendUrl),
            activeProvider: typeof raw.activeProvider === 'string' ? raw.activeProvider : 'gemini',
            aiMode: (['managed', 'byok', 'free'].includes(raw.aiMode) ? raw.aiMode : 'managed') as AIMode,
            selectedModel: typeof raw.selectedModel === 'string' && raw.selectedModel ? raw.selectedModel : 'gemini-3.5-flash',
            byokVault: raw.byokVault && typeof raw.byokVault === 'object' ? raw.byokVault : {},
            safeWorkflowEnabled: typeof raw.safeWorkflowEnabled === 'boolean' ? raw.safeWorkflowEnabled : true,
            actionCooldownSeconds: typeof raw.actionCooldownSeconds === 'number' ? Math.max(1, raw.actionCooldownSeconds) : 3,
            lastUpdated: typeof raw.lastUpdated === 'number' ? raw.lastUpdated : Date.now(),
          };
          resolve(validated);
        });
      });
    }

    return { ...this.memorySettings };
  }

  /**
   * Persists updated settings
   */
  public static async saveSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...updates,
      version: 2,
      backendUrl: updates.backendUrl ? this.sanitizeBackendUrl(updates.backendUrl) : current.backendUrl,
      lastUpdated: Date.now(),
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [SETTINGS_KEY]: updated }, () => resolve());
      });
    } else {
      this.memorySettings = updated;
    }

    return updated;
  }

  /**
   * Stores an API key for a specific provider in the BYOK vault
   */
  public static async saveByokKey(provider: string, apiKey: string): Promise<void> {
    const current = await this.getSettings();
    const vault = { ...current.byokVault, [provider.toLowerCase()]: apiKey.trim() };
    await this.saveSettings({ byokVault: vault });
  }

  /**
   * Retrieves an API key from the BYOK vault
   */
  public static async getByokKey(provider: string): Promise<string | undefined> {
    const current = await this.getSettings();
    return current.byokVault[provider.toLowerCase()];
  }

  /**
   * Clears a key from the BYOK vault
   */
  public static async removeByokKey(provider: string): Promise<void> {
    const current = await this.getSettings();
    const vault = { ...current.byokVault };
    delete vault[provider.toLowerCase()];
    await this.saveSettings({ byokVault: vault });
  }

  /**
   * Retrieves the user-initiated activity log (last 20 entries)
   */
  public static async getActivityLog(): Promise<ActivityEntry[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([ACTIVITY_KEY], (res) => {
          const list = Array.isArray(res[ACTIVITY_KEY]) ? res[ACTIVITY_KEY] : [];
          resolve(list);
        });
      });
    }

    return [...this.memoryActivity];
  }

  /**
   * Appends an entry to the user activity history
   */
  public static async logActivity(
    entry: Omit<ActivityEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const fullEntry: ActivityEntry = {
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    const current = await this.getActivityLog();
    const updated = [fullEntry, ...current].slice(0, 25); // Ring buffer of 25

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [ACTIVITY_KEY]: updated }, () => resolve());
      });
    } else {
      this.memoryActivity = updated;
    }
  }

  /**
   * Fully purges all local CodeMate data (snippets, settings, activity logs)
   * Implements complete local cleanup for student data privacy
   */
  public static async clearAllLocalData(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([SETTINGS_KEY, ACTIVITY_KEY, LEGACY_SNIPPETS_KEY], () => resolve());
      });
    }
    this.memorySettings = { ...DEFAULT_SETTINGS };
    this.memoryActivity = [];
  }
}

