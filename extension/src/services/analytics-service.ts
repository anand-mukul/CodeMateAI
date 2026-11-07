/**
 * CodeMate AI — Privacy-Conscious Product Analytics Service (analytics-service.ts)
 * 
 * Ingests allowlisted telemetry in batched dispatches.
 * STRICT PRIVACY GUARENTEES:
 * - Zero code snippets, AST representations, or prompts transmitted.
 * - Zero clipboard, keystrokes, or full URL queries.
 * - Immediate client-side drops when user has opted out.
 */

import { AuthService } from './auth-service';

export interface ClientAnalyticsEvent {
  event_name: string;
  feature_name?: string;
  duration_ms?: number;
  success?: boolean;
  failure_category?: string;
  token_usage?: number;
  model_identifier?: string;
  plan_identifier?: string;
  application_version?: string;
  session_id?: string;
}

const ANALYTICS_OPT_OUT_KEY = 'codemate_analytics_opt_out';

export class AnalyticsService {
  private static eventQueue: ClientAnalyticsEvent[] = [];
  private static flushIntervalMs = 15000; // 15 seconds
  private static isOptedOut: boolean = false;
  private static isInitialized: boolean = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load local opt-out state
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([ANALYTICS_OPT_OUT_KEY]);
      if (res[ANALYTICS_OPT_OUT_KEY] !== undefined) {
        this.isOptedOut = Boolean(res[ANALYTICS_OPT_OUT_KEY]);
      }
    }

    // Start flush timer
    setInterval(() => {
      this.flushQueue();
    }, this.flushIntervalMs);
  }

  public static isUserOptedOut(): boolean {
    return this.isOptedOut;
  }

  public static async setOptOut(optOut: boolean): Promise<void> {
    this.isOptedOut = optOut;
    this.eventQueue = [];

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [ANALYTICS_OPT_OUT_KEY]: optOut });
    }

    try {
      await AuthService.fetchAuth('/api/analytics/preferences', {
        method: 'PUT',
        body: JSON.stringify({ opt_out: optOut }),
      });
    } catch {
      // Ignored if offline
    }
  }

  /**
   * Enqueues an allowlisted telemetry event. Silently drops if user is opted out.
   */
  public static track(event: ClientAnalyticsEvent): void {
    if (this.isOptedOut) return;

    this.eventQueue.push({
      ...event,
      application_version: '1.0.0',
    });

    if (this.eventQueue.length >= 10) {
      this.flushQueue();
    }
  }

  public static async flushQueue(): Promise<void> {
    if (this.isOptedOut || this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await AuthService.fetchAuth('/api/analytics/events', {
        method: 'POST',
        body: JSON.stringify({ events: batch }),
      });
    } catch (err) {
      // On failure, re-queue up to 30 events to avoid unbounded memory growth
      if (this.eventQueue.length < 30) {
        this.eventQueue.unshift(...batch.slice(-10));
      }
    }
  }
}
