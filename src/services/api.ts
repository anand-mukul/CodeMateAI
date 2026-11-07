/**
 * CodeMate AI — Frontend Backend API Client (api.ts)
 * 
 * Provides typed methods connecting the Chrome extension to the FastAPI backend.
 * Integrated with the Adaptive Activity & Reliability Engine:
 * - Request Scheduler (concurrency control & duplicate suppression)
 * - Adaptive Backoff with bounded random jitter
 * - Idempotency-Key generation
 * - Retry-After compliance
 */

import {
  ProblemRequestDTO,
  ProblemAnalysisDTO,
  ProblemExplanationDTO,
  SolutionResponseDTO,
  OptimizationRequestDTO,
  OptimizationResponseDTO,
  SolutionFixRequestDTO,
  SolutionFixResponseDTO,
  HealthResponseDTO,
  AIStatusResponseDTO,
  BackendErrorDTO,
} from '../types/ai';
import { ReliabilityEngine, ReliabilityActionType } from './reliability-engine';
import { AuthService } from './auth-service';
import { StorageService } from './storage';

export class CodeMateAPIError extends Error {
  public errorCode: string;
  public status?: number;
  public retryAfter?: number;

  constructor(message: string, errorCode = 'API_ERROR', status?: number, retryAfter?: number) {
    super(message);
    this.name = 'CodeMateAPIError';
    this.errorCode = errorCode;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export class CodeMateApiClient {
  private static baseUrl: string = (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');

  private static defaultTimeoutMs = 30000;

  /**
   * Sets custom backend URL dynamically (useful for test mocks or settings)
   */
  public static setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
    AuthService.setBaseUrl(this.baseUrl);
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Core typed HTTP fetch wrapper routed through the Reliability Engine.
   */
  public static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 2,
    providerOverride?: string,
    action?: ReliabilityActionType
  ): Promise<T> {
    const key = `${options.method || 'GET'}:${endpoint}`;

    return ReliabilityEngine.scheduleRequest<T>(
      key,
      async (idempotencyKey, _attempt) => {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

        // Forward user signal cancellation if provided
        if (options.signal) {
          options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        const token = await AuthService.getAccessToken();
        const deviceId = await AuthService.getDeviceId();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          'X-Device-ID': deviceId,
          ...(options.headers as Record<string, string> || {}),
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const settings = await StorageService.getSettings();
        const activeProvider = providerOverride || settings.activeProvider;
        headers['X-CodeMate-Provider'] = activeProvider;
        if (settings.selectedModel) {
          headers['X-CodeMate-Model'] = settings.selectedModel;
        }
        if (settings.aiMode === 'byok' && settings.byokVault[activeProvider.toLowerCase()]) {
          headers['X-CodeMate-API-Key'] = settings.byokVault[activeProvider.toLowerCase()];
        }

        const config: RequestInit = {
          ...options,
          signal: controller.signal,
          headers,
        };

        try {
          let response = await fetch(url, config);
          clearTimeout(timeoutId);

          // Handle token expiration & automatic rotation (HTTP 401)
          if (response.status === 401 && token) {
            const refreshed = await AuthService.refreshTokens();
            if (refreshed) {
              headers['Authorization'] = `Bearer ${refreshed.access_token}`;
              const retryConfig: RequestInit = {
                ...options,
                signal: controller.signal,
                headers,
              };
              response = await fetch(url, retryConfig);
            } else {
              await AuthService.clearTokens();
            }
          }

          if (!response.ok) {
            let errorData: BackendErrorDTO | null = null;
            try {
              errorData = (await response.json()) as BackendErrorDTO;
            } catch {
              // Non-JSON error payload
            }

            const detail = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
            const errorCode = errorData?.error_code || `HTTP_${response.status}`;

            // Parse Retry-After header (in seconds) if present
            let retryAfterSec: number | undefined;
            const retryHeader = response.headers.get('retry-after');
            if (retryHeader) {
              const parsed = parseInt(retryHeader, 10);
              if (!isNaN(parsed) && parsed > 0) retryAfterSec = parsed;
            }

            if (response.status === 429) {
              throw new CodeMateAPIError(
                'Rate limit exceeded. Adaptive backoff active.',
                'RATE_LIMITED',
                429,
                retryAfterSec || 5
              );
            }

            throw new CodeMateAPIError(detail, errorCode, response.status, retryAfterSec);
          }

          const data = (await response.json()) as T;
          return { status: response.status, data };
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof CodeMateAPIError) {
            throw err;
          }

          if (err instanceof DOMException && err.name === 'AbortError') {
            throw new CodeMateAPIError(
              `Request to backend timed out after ${this.defaultTimeoutMs / 1000} seconds.`,
              'GATEWAY_TIMEOUT',
              504
            );
          }

          throw new CodeMateAPIError(
            `Could not connect to CodeMate AI backend at ${this.baseUrl}. Please verify the Python server is running on port 8000.`,
            'NETWORK_OFFLINE',
            503
          );
        }
      },
      {
        action,
        maxRetries,
        signal: options.signal || undefined,
        isInteractive: options.method === 'POST',
      }
    );
  }

  /**
   * GET /api/health
   */
  public static async getBackendHealth(): Promise<HealthResponseDTO> {
    return this.request<HealthResponseDTO>('/api/health', { method: 'GET' }, 1);
  }

  /**
   * GET /api/ai/status
   */
  public static async getAIStatus(providerOverride?: string): Promise<AIStatusResponseDTO> {
    const query = providerOverride ? `?provider=${encodeURIComponent(providerOverride)}` : '';
    return this.request<AIStatusResponseDTO>(`/api/ai/status${query}`, { method: 'GET' }, 1, providerOverride);
  }

  /**
   * POST /api/problem/analyze
   */
  public static async analyzeProblem(
    problem: ProblemRequestDTO,
    providerOverride?: string
  ): Promise<ProblemAnalysisDTO> {
    return this.request<ProblemAnalysisDTO>(
      '/api/problem/analyze',
      {
        method: 'POST',
        body: JSON.stringify(problem),
      },
      2,
      providerOverride,
      'ANALYZE'
    );
  }

  /**
   * POST /api/problem/explain
   */
  public static async explainProblem(
    problem: ProblemRequestDTO,
    providerOverride?: string
  ): Promise<ProblemExplanationDTO> {
    return this.request<ProblemExplanationDTO>(
      '/api/problem/explain',
      {
        method: 'POST',
        body: JSON.stringify(problem),
      },
      2,
      providerOverride,
      'EXPLAIN'
    );
  }

  /**
   * POST /api/solution/generate
   */
  public static async generateSolution(
    problem: ProblemRequestDTO,
    providerOverride?: string
  ): Promise<SolutionResponseDTO> {
    return this.request<SolutionResponseDTO>(
      '/api/solution/generate',
      {
        method: 'POST',
        body: JSON.stringify(problem),
      },
      2,
      providerOverride,
      'GENERATE'
    );
  }

  /**
   * POST /api/solution/optimize
   */
  public static async optimizeSolution(
    request: OptimizationRequestDTO,
    providerOverride?: string
  ): Promise<OptimizationResponseDTO> {
    return this.request<OptimizationResponseDTO>(
      '/api/solution/optimize',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      2,
      providerOverride,
      'OPTIMIZE'
    );
  }

  /**
   * POST /api/solution/fix
   */
  public static async diagnoseAndFixSolution(
    request: SolutionFixRequestDTO,
    providerOverride?: string
  ): Promise<SolutionFixResponseDTO> {
    return this.request<SolutionFixResponseDTO>(
      '/api/solution/fix',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      2,
      providerOverride,
      'FIX'
    );
  }

  /**
   * GET /api/ready
   */
  public static async getBackendReadiness(): Promise<{ status: string; environment: string; provider?: string }> {
    return this.request<{ status: string; environment: string; provider?: string }>('/api/ready', { method: 'GET' }, 1);
  }
}

// Modular Service Exports:
export const ProblemService = {
  analyze: (problem: ProblemRequestDTO, provider?: string) =>
    CodeMateApiClient.analyzeProblem(problem, provider),
  explain: (problem: ProblemRequestDTO, provider?: string) =>
    CodeMateApiClient.explainProblem(problem, provider),
};

export const SolutionService = {
  generate: (problem: ProblemRequestDTO, provider?: string) =>
    CodeMateApiClient.generateSolution(problem, provider),
  optimize: (request: OptimizationRequestDTO, provider?: string) =>
    CodeMateApiClient.optimizeSolution(request, provider),
  fix: (request: SolutionFixRequestDTO, provider?: string) =>
    CodeMateApiClient.diagnoseAndFixSolution(request, provider),
};

export const AISystemService = {
  getHealth: () => CodeMateApiClient.getBackendHealth(),
  getReadiness: () => CodeMateApiClient.getBackendReadiness(),
  getStatus: (provider?: string) => CodeMateApiClient.getAIStatus(provider),
  setBaseUrl: (url: string) => CodeMateApiClient.setBaseUrl(url),
  getBaseUrl: () => CodeMateApiClient.getBaseUrl(),
};
