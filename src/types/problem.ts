import { ExampleCaseDTO } from './ai';

export interface ProblemContext {
  platform: 'CodeChef' | 'Unknown';
  problemCode: string | null;
  problemTitle: string | null;
  url: string;
  language: string;
  difficulty?: string;
  isContest: boolean;
  isPractice: boolean;
  editorAttached: boolean;
  editorFramework?: string;
  timestamp: number;
  // Phase 4 Problem Statement Extraction Fields:
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleCases?: ExampleCaseDTO[];
  extractionSuccess?: boolean;
}

