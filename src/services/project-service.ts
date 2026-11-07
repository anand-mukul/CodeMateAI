/**
 * CodeMate AI — Phase 7 Project Intelligence Service
 * Provides typed methods for multi-file project import, architecture analysis,
 * task planning, coordinated patch application, and diagnostic error repair.
 */

import { AuthService } from './auth-service';
import { CodeMateApiClient } from './api';

export interface ProjectDTO {
  id: string;
  name: string;
  framework: string;
  build_system: string;
  root_path?: string | null;
  indexed_file_count: number;
  created_at: string;
}

export interface ProjectFileDTO {
  id: string;
  relative_path: string;
  file_name: string;
  language: string;
  is_test: boolean;
  is_excluded: boolean;
  line_count: number;
  byte_size: number;
  content_hash: string;
  content?: string;
}

export interface ProjectGraphEdgeDTO {
  source: string;
  target: string;
  type: string;
  weight: number;
  metadata?: Record<string, any>;
}

export interface ProjectGraphDTO {
  nodes: string[];
  edges: ProjectGraphEdgeDTO[];
}

export interface SpringBootEndpointDTO {
  method: string;
  path: string;
  handler_method: string;
  line_number: number;
}

export interface SpringBootComponentDTO {
  name: string;
  file_path: string;
  layer: string;
  endpoints?: SpringBootEndpointDTO[];
  dependencies?: string[];
}

export interface AntiPatternDTO {
  type: string;
  class: string;
  file: string;
  description: string;
  severity: 'WARNING' | 'ERROR' | 'INFO';
}

export interface ProjectArchitectureDTO {
  framework: string;
  build_system: string;
  controllers: SpringBootComponentDTO[];
  services: SpringBootComponentDTO[];
  repositories: SpringBootComponentDTO[];
  entities: SpringBootComponentDTO[];
  endpoints: SpringBootEndpointDTO[];
  anti_patterns: AntiPatternDTO[];
}

export interface PlanStepDTO {
  step_number: number;
  file_path: string;
  action: 'INSPECT' | 'MODIFY' | 'CREATE' | 'VERIFY';
  reason: string;
}

export interface PlanResponseDTO {
  task: string;
  steps: PlanStepDTO[];
  affected_files: string[];
  risk_assessment: string;
}

export interface PatchFileDTO {
  file_path: string;
  diff_content: string;
  original_hash: string;
  new_hash: string;
  patch_status: string;
}

export interface PatchResponseDTO {
  id: string;
  project_id: string;
  description: string;
  status: string;
  files: PatchFileDTO[];
}

export interface DiagnosticDTO {
  file_path: string;
  line_number: number;
  error_message: string;
  category: string;
}

export interface DiagnoseResponseDTO {
  diagnostics: DiagnosticDTO[];
  proposed_repairs: Array<{
    status: string;
    attempt: number;
    file_path: string;
    explanation: string;
    diff_content: string;
    new_content: string;
  }>;
}

export class ProjectService {
  private static getBaseUrl(): string {
    return CodeMateApiClient.getBaseUrl();
  }

  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AuthService.getAccessToken();
    const deviceId = await AuthService.getDeviceId();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (deviceId) headers['X-Device-ID'] = deviceId;
    return headers;
  }

  /**
   * Upload and import a ZIP archive of a project.
   */
  public static async importZip(file: File): Promise<ProjectDTO> {
    const url = `${this.getBaseUrl()}/api/projects/import-zip`;
    const formData = new FormData();
    formData.append('file', file);

    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = err.detail || {};
      const msg = typeof detail === 'string' ? detail : detail.message || 'Import failed';
      throw new Error(msg);
    }

    return response.json();
  }

  /**
   * List user projects.
   */
  public static async listProjects(): Promise<ProjectDTO[]> {
    const url = `${this.getBaseUrl()}/api/projects`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }

  /**
   * Get single project details.
   */
  public static async getProject(id: string): Promise<ProjectDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${id}`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Project not found');
    return response.json();
  }

  /**
   * Delete a project.
   */
  public static async deleteProject(id: string): Promise<void> {
    const url = `${this.getBaseUrl()}/api/projects/${id}`;
    const headers = await this.getAuthHeaders();
    await fetch(url, { method: 'DELETE', headers });
  }

  /**
   * Fetch indexed file tree.
   */
  public static async getFileTree(projectId: string): Promise<ProjectFileDTO[]> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/tree`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to load file tree');
    return response.json();
  }

  /**
   * Fetch dependency graph.
   */
  public static async getGraph(projectId: string): Promise<ProjectGraphDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/graph`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to load project graph');
    return response.json();
  }

  /**
   * Fetch Spring Boot architecture analysis.
   */
  public static async getArchitecture(projectId: string): Promise<ProjectArchitectureDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/architecture`;
    const headers = await this.getAuthHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to load architecture');
    return response.json();
  }

  /**
   * Request multi-file task plan.
   */
  public static async planTask(projectId: string, taskDescription: string): Promise<PlanResponseDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/plan`;
    const headers = { ...(await this.getAuthHeaders()), 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ task_description: taskDescription }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Failed to generate task plan');
    }
    return response.json();
  }

  /**
   * Generate coordinated multi-file patches.
   */
  public static async generatePatches(
    projectId: string,
    taskDescription: string,
    targetFiles?: string[]
  ): Promise<PatchResponseDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/patches`;
    const headers = { ...(await this.getAuthHeaders()), 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ task_description: taskDescription, target_files: targetFiles }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Failed to generate patches');
    }
    return response.json();
  }

  /**
   * Apply an approved patch with hash concurrency protection.
   */
  public static async applyPatch(projectId: string, patchId: string): Promise<{ status: string; applied_files_count: number }> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/patches/${patchId}/apply`;
    const headers = { ...(await this.getAuthHeaders()), 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Failed to apply patch');
    }
    return response.json();
  }

  /**
   * Rollback a previously applied patch.
   */
  public static async rollbackPatch(projectId: string, patchId: string): Promise<{ status: string; reverted_files_count: number }> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/patches/${patchId}/rollback`;
    const headers = { ...(await this.getAuthHeaders()), 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Failed to rollback patch');
    }
    return response.json();
  }

  /**
   * Parse error output and propose targeted fixes.
   */
  public static async diagnoseError(projectId: string, errorOutput: string): Promise<DiagnoseResponseDTO> {
    const url = `${this.getBaseUrl()}/api/projects/${projectId}/diagnose`;
    const headers = { ...(await this.getAuthHeaders()), 'Content-Type': 'application/json' };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ error_output: errorOutput }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || 'Failed to diagnose compiler errors');
    }
    return response.json();
  }
}

