/**
 * CodeMate AI — Adaptive Activity & Reliability Engine (services/reliability-engine.ts)
 * 
 * Production-grade shared reliability service providing:
 * 1. Request Scheduler (concurrency management, duplicate suppression, idempotency keys)
 * 2. Adaptive Backoff (exponential backoff with bounded random jitter, Retry-After compliance)
 * 3. Cooldown Manager (per-action cooldown timers preventing rapid repeated clicks)
 * 4. Workflow Recovery Service (persisted MV3 workflow state across service worker suspension/popup reopens)
 * 5. Telemetry & Reliability Metrics Store (latency, retry counts, queue pressure, sanitized recent errors)
 * 
 * Strictly non-stealth: traffic management and resilience only; never conceals identity or automates platform actions.
 */

export type ReliabilityActionType =
  | 'GENERATE'
  | 'ANALYZE'
  | 'EXPLAIN'
  | 'OPTIMIZE'
  | 'FIX'
  | 'REPLACE_EDITOR';

export interface WorkflowSnapshot {
  workflowId: string;
  problemCode: string;
  problemTitle: string;
  language: string;
  stage: string;
  timestamp: number;
  originalCodeSnapshot?: string;
  generatedCode?: string;
  fixedCode?: string;
  hasAppliedToEditor: boolean;
}

export interface ReliabilityMetrics {
  backendOnline: boolean;
  activeProvider: string;
  lastLatencyMs: number;
  inFlightRequests: number;
  totalRequests: number;
  totalRetries: number;
  rateLimitHits: number;
  cooldownRemainingSeconds: number;
  recentErrors: Array<{ timestamp: number; message: string; code?: string; endpoint?: string }>;
}

const WORKFLOW_STORAGE_KEY = 'codemate_active_workflow_v1';

export class ReliabilityEngine {
  // Concurrency & in-flight tracking
  private static maxConcurrency = 1;
  private static activeCount = 0;
  private static inFlightMap = new Map<string, Promise<unknown>>();

  // Cooldown tracking (in milliseconds)
  private static cooldownDefaults: Record<ReliabilityActionType, number> = {
    GENERATE: 3000,
    ANALYZE: 3000,
    EXPLAIN: 2000,
    OPTIMIZE: 3000,
    FIX: 3000,
    REPLACE_EDITOR: 3000,
  };
  private static lastActionTimestamps: Map<ReliabilityActionType, number> = new Map();

  // Metrics & telemetry
  private static metrics: ReliabilityMetrics = {
    backendOnline: false,
    activeProvider: 'gemini',
    lastLatencyMs: 0,
    inFlightRequests: 0,
    totalRequests: 0,
    totalRetries: 0,
    rateLimitHits: 0,
    cooldownRemainingSeconds: 0,
    recentErrors: [],
  };

  private static listeners: Set<(metrics: ReliabilityMetrics) => void> = new Set();

  /**
   * Subscribe to live reliability metrics updates
   */
  public static subscribe(listener: (metrics: ReliabilityMetrics) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.metrics });
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(): void {
    const copy = { ...this.metrics, inFlightRequests: this.activeCount };
    this.listeners.forEach((l) => l(copy));
  }

  // ============================================================================
  // 1. COOLDOWN MANAGER
  // ============================================================================

  /**
   * Checks if an action is currently in cooldown.
   * Returns remaining cooldown in milliseconds (0 if ready).
   */
  public static checkCooldown(action: ReliabilityActionType): { allowed: boolean; remainingMs: number } {
    const now = Date.now();
    const lastTime = this.lastActionTimestamps.get(action) || 0;
    const cooldownMs = this.cooldownDefaults[action] || 3000;
    const elapsed = now - lastTime;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return { allowed: false, remainingMs };
    }
    return { allowed: true, remainingMs: 0 };
  }

  /**
   * Records that an action was triggered, activating its cooldown window.
   */
  public static triggerCooldown(action: ReliabilityActionType, customCooldownMs?: number): void {
    this.lastActionTimestamps.set(action, Date.now());
    const duration = customCooldownMs || this.cooldownDefaults[action] || 3000;
    this.metrics.cooldownRemainingSeconds = Math.ceil(duration / 1000);
    this.notifyListeners();

    // Tick down remaining seconds
    const interval = setInterval(() => {
      const { remainingMs } = this.checkCooldown(action);
      this.metrics.cooldownRemainingSeconds = Math.ceil(remainingMs / 1000);
      this.notifyListeners();
      if (remainingMs <= 0) {
        clearInterval(interval);
        this.metrics.cooldownRemainingSeconds = 0;
        this.notifyListeners();
      }
    }, 1000);
  }

  // ============================================================================
  // 2. ADAPTIVE BACKOFF WITH BOUNDED JITTER
  // ============================================================================

  /**
   * Determines whether an HTTP status code or error represents a retryable transient failure.
   * Permanent failures (400, 401, 403, 413, 422) are NEVER retried.
   */
  public static isRetryable(status?: number, err?: Error): boolean {
    if (status) {
      if ([429, 502, 503, 504].includes(status)) return true;
      if (status >= 400 && status < 500) return false; // 400, 401, 403, 413, 422
      if (status >= 500) return true;
    }
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('aborted')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculates exponential backoff with bounded random jitter (15% spread).
   * Backoff = min(maxDelay, initialDelay * 2^attempt) * (0.85 + Math.random() * 0.3)
   */
  public static calculateBackoff(
    attempt: number,
    initialDelayMs = 1000,
    maxDelayMs = 8000,
    retryAfterSeconds?: number
  ): number {
    if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
      // Respect explicit Retry-After header with minimal safety padding
      return Math.min(retryAfterSeconds * 1000, 15000) + Math.floor(Math.random() * 250);
    }

    const exponential = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
    // Bounded jitter between 85% and 115% to avoid synchronized retry stampedes
    const jitterFactor = 0.85 + Math.random() * 0.3;
    return Math.floor(exponential * jitterFactor);
  }

  // ============================================================================
  // 3. REQUEST SCHEDULER (CONCURRENCY, DEDUPLICATION, IDEMPOTENCY)
  // ============================================================================

  /**
   * Executes an asynchronous task through the Request Scheduler:
   * - Deduplicates identical concurrent requests
   * - Enforces concurrency limit (max 1 interactive request)
   * - Applies exponential backoff with jitter on transient failures
   * - Emits technical telemetry (latency, retry count, errors)
   */
  public static async scheduleRequest<T>(
    operationKey: string,
    executeFn: (idempotencyKey: string, attempt: number) => Promise<{ status?: number; data: T }>,
    options: {
      action?: ReliabilityActionType;
      maxRetries?: number;
      signal?: AbortSignal;
      isInteractive?: boolean;
    } = {}
  ): Promise<T> {
    const { action, maxRetries = 2, signal, isInteractive = true } = options;

    // Check cooldown for interactive actions
    if (action && isInteractive) {
      const cooldown = this.checkCooldown(action);
      if (!cooldown.allowed) {
        throw new Error(
          `Action is cooling down. Please wait ${Math.ceil(cooldown.remainingMs / 1000)}s before repeating.`
        );
      }
    }

    // Check in-flight deduplication
    if (this.inFlightMap.has(operationKey)) {
      // Return existing in-flight promise to avoid duplicate network load
      return this.inFlightMap.get(operationKey) as Promise<T>;
    }

    // Generate unique idempotency key for this logical operation
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Wrap execution inside managed scheduler promise
    const taskPromise = (async () => {
      // Wait for concurrency slot if active count exceeds limit
      while (this.activeCount >= this.maxConcurrency) {
        if (signal?.aborted) throw new Error('Request cancelled by user before execution slot opened');
        await new Promise((r) => setTimeout(r, 100));
      }

      this.activeCount++;
      this.metrics.inFlightRequests = this.activeCount;
      this.notifyListeners();

      const startTime = Date.now();
      let lastErr: Error | null = null;
      let attempt = 0;

      try {
        while (attempt <= maxRetries) {
          if (signal?.aborted) {
            throw new Error('Request cancelled by user');
          }

          try {
            this.metrics.totalRequests++;
            const res = await executeFn(idempotencyKey, attempt);

            // Record success telemetry
            const latency = Date.now() - startTime;
            this.metrics.lastLatencyMs = latency;
            this.metrics.backendOnline = true;
            if (action) this.triggerCooldown(action);
            this.notifyListeners();

            return res.data;
          } catch (err: unknown) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            const status = (err as { status?: number })?.status;

            // Track rate limit events
            if (status === 429) {
              this.metrics.rateLimitHits++;
            }

            // Fast fail if non-retryable or cancelled
            if (signal?.aborted || !this.isRetryable(status, lastErr) || attempt >= maxRetries) {
              throw lastErr;
            }

            // Retryable transient failure: compute backoff with bounded jitter
            attempt++;
            this.metrics.totalRetries++;
            this.notifyListeners();

            const retryAfterSec = (err as { retryAfter?: number })?.retryAfter;
            const delay = this.calculateBackoff(attempt, 1000, 6000, retryAfterSec);

            await new Promise((resolve) => {
              const timer = setTimeout(resolve, delay);
              signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
            });
          }
        }

        throw lastErr || new Error('Request failed after max retries');
      } finally {
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.inFlightMap.delete(operationKey);
        this.metrics.inFlightRequests = this.activeCount;
        this.notifyListeners();
      }
    })();

    this.inFlightMap.set(operationKey, taskPromise);

    return taskPromise.catch((err) => {
      this.recordError(err.message, operationKey);
      throw err;
    });
  }

  private static recordError(message: string, endpoint?: string): void {
    // Sanitize: strip out any stray API keys or bearer tokens
    const cleanMsg = message
      .replace(/AIza[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .slice(0, 150);

    const errorEntry = {
      timestamp: Date.now(),
      message: cleanMsg,
      endpoint: endpoint ? endpoint.slice(0, 40) : undefined,
    };

    this.metrics.recentErrors = [errorEntry, ...this.metrics.recentErrors].slice(0, 5);
    this.notifyListeners();
  }

  // ============================================================================
  // 4. LONG-RUNNING WORKFLOW RECOVERY (MV3 RESILIENCE)
  // ============================================================================

  /**
   * Persists the active workflow state to storage so it survives MV3 service worker
   * idling, side panel reopening, or accidental page reloads.
   */
  public static async saveActiveWorkflow(workflow: WorkflowSnapshot): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [WORKFLOW_STORAGE_KEY]: workflow }, () => resolve());
      });
    }
  }

  /**
   * Retrieves the stored workflow snapshot, if any exists.
   */
  public static async getSavedWorkflow(): Promise<WorkflowSnapshot | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([WORKFLOW_STORAGE_KEY], (res) => {
          const w = res[WORKFLOW_STORAGE_KEY];
          if (!w || typeof w !== 'object') {
            resolve(null);
            return;
          }

          // Invalidate stale workflows older than 30 minutes
          if (Date.now() - (w.timestamp || 0) > 30 * 60 * 1000) {
            this.clearSavedWorkflow();
            resolve(null);
            return;
          }

          resolve(w as WorkflowSnapshot);
        });
      });
    }
    return null;
  }

  /**
   * Clears the active workflow state from storage upon completion or cancellation.
   */
  public static async clearSavedWorkflow(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([WORKFLOW_STORAGE_KEY], () => resolve());
      });
    }
  }

  /**
   * Updates health and provider metadata from external ping
   */
  public static updateSystemStatus(backendOnline: boolean, activeProvider: string): void {
    this.metrics.backendOnline = backendOnline;
    this.metrics.activeProvider = activeProvider;
    this.notifyListeners();
  }

  /**
   * Retrieves current snapshot of all technical reliability metrics
   */
  public static getMetrics(): ReliabilityMetrics {
    return { ...this.metrics, inFlightRequests: this.activeCount };
  }
}
