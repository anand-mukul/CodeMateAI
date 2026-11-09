/**
 * CodeMate AI — Phase 3 AI Backend Contracts & Data Transfer Objects (DTO)
 */

export interface ExampleCaseDTO {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemRequestDTO {
  title: string;
  problem_statement: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  examples?: ExampleCaseDTO[];
  selected_language?: string;
  starter_code?: string;
  workspace_files?: Record<string, string>;
  platform?: string;
  problem_url?: string;
}

export interface PotentialApproachDTO {
  name: string;
  time_complexity: string;
  space_complexity: string;
  feasibility: string;
  description: string;
}

export interface ProblemAnalysisDTO {
  problem_summary: string;
  objective: string;
  input_description: string;
  output_description: string;
  constraints_analysis: string;
  important_observations: string[];
  potential_approaches: PotentialApproachDTO[];
  recommended_algorithm: string;
  recommended_data_structures: string[];
  expected_time_complexity: string;
  expected_space_complexity: string;
  edge_cases: string[];
}

export interface ProblemExplanationDTO {
  problem_title: string;
  simple_summary: string;
  what_is_asked: string;
  input_breakdown: string;
  output_breakdown: string;
  example_walkthrough: string[];
  key_observations: string[];
  edge_cases_to_consider: string[];
}

export interface ComplexityItemDTO {
  notation: string;
  explanation: string;
}

export interface ComplexityAnalysisDTO {
  time: ComplexityItemDTO;
  space: ComplexityItemDTO;
}

export interface ApproachDetailDTO {
  name: string;
  explanation: string;
  steps: string[];
}

export interface SolutionResponseDTO {
  success: boolean;
  problem_summary: string;
  approach: ApproachDetailDTO;
  algorithm: string;
  data_structures: string[];
  code: string;
  workspace_files?: Array<{ filename: string; code: string }>;
  language: string;
  complexity: ComplexityAnalysisDTO;
  edge_cases: string[];
  sample_case_analysis: string[];
  warnings: string[];
  provider: string;
  model: string;
}

export interface OptimizationRequestDTO {
  problem: ProblemRequestDTO;
  existing_code: string;
  current_language: string;
}

export interface OptimizationResponseDTO {
  success: boolean;
  improved_code: string;
  language: string;
  explanation_of_changes: string;
  original_complexity: ComplexityAnalysisDTO;
  optimized_complexity: ComplexityAnalysisDTO;
  bottlenecks_eliminated: string[];
  tradeoffs: string[];
  provider: string;
  model: string;
}

export interface HealthResponseDTO {
  status: string;
  service: string;
  version: string;
  timestamp: number;
}

export interface AIStatusResponseDTO {
  provider: string;
  model: string;
  available: boolean;
  is_mock: boolean;
  details?: Record<string, unknown>;
}

export interface BackendErrorDTO {
  success: false;
  error_code: string;
  detail: string;
  request_id?: string;
  timestamp: number;
}

export interface SolutionFixRequestDTO {
  problem: ProblemRequestDTO;
  selected_language?: string;
  current_code: string;
  error_message: string;
  expected_output?: string;
  actual_output?: string;
  test_case?: string;
}

export interface SolutionFixResponseDTO {
  success: boolean;
  fixed_code: string;
  language: string;
  error_category: string;
  explanation: string;
  changes_made: string[];
  potential_side_effects: string[];
  confidence: string;
  provider: string;
  model: string;
}


