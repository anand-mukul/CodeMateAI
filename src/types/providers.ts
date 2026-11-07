export type AIProviderId = 'openai' | 'gemini' | 'anthropic' | 'deepseek' | 'xai' | 'openrouter' | 'mock';

export type AIMode = 'managed' | 'byok' | 'free';

export type ModelProfile = 'fast' | 'balanced' | 'advanced' | 'free';

export interface ModelCapability {
  codeGeneration: boolean;
  codeExplanation: boolean;
  projectAnalysis: boolean;
  structuredJson: boolean;
  maxOutputTokens: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProviderId;
  profile: ModelProfile;
  isFree?: boolean;
  contextWindow?: number;
  description: string;
  capabilities: ModelCapability;
}

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  adapter: string;
  keyRequired: boolean;
  badge?: string;
  docUrl?: string;
  models: ModelOption[];
}

