/**
 * CodeMate AI — Dynamic AI Provider Registry & Model Catalog
 * 
 * Central registry of all supported AI providers, adapters, and model profiles.
 * Frontend components must consume this registry rather than hardcoding provider logic.
 */

import { AIProviderId, ProviderConfig, ModelOption } from '../types/providers';

export const PROVIDER_REGISTRY: Record<AIProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    adapter: 'openai',
    keyRequired: true,
    badge: 'Available',
    docUrl: 'https://developers.openai.com/api/docs',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        profile: 'fast',
        description: 'Affordable, fast, lightweight model for everyday competitive coding.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        profile: 'balanced',
        description: 'Flagship omni model with advanced coding and algorithmic depth.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'openai',
        profile: 'advanced',
        description: 'High-reasoning STEM model specialized for competitive programming and math.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    enabled: true,
    adapter: 'gemini',
    keyRequired: true,
    badge: 'Available',
    docUrl: 'https://ai.google.dev/gemini-api/docs/get-started',
    models: [
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'gemini',
        profile: 'fast',
        description: 'Google’s ultra-fast, high-quota standard production model.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        provider: 'gemini',
        profile: 'fast',
        description: 'Ultra-low latency model for lightning fast iterations.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'gemini',
        profile: 'balanced',
        description: 'Next-generation model with expanded reasoning capacity.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    enabled: false,
    adapter: 'anthropic',
    keyRequired: true,
    badge: 'Coming Soon',
    docUrl: 'https://platform.claude.com/docs/en/home',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        profile: 'advanced',
        description: 'Industry-standard coding model with superior reasoning.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        profile: 'fast',
        description: 'High-speed coding model for snappy code fixes.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    enabled: false,
    adapter: 'deepseek',
    keyRequired: true,
    badge: 'Coming Soon',
    docUrl: 'https://api-docs.deepseek.com/',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3',
        provider: 'deepseek',
        profile: 'balanced',
        description: 'High-performance coding model with strong algorithmic depth.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        profile: 'advanced',
        description: 'Reasoning model with chain-of-thought problem solving.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  xai: {
    id: 'xai',
    name: 'Grok',
    enabled: false,
    adapter: 'xai',
    keyRequired: true,
    badge: 'Coming Soon',
    docUrl: 'https://docs.x.ai/overview',
    models: [
      {
        id: 'grok-2',
        name: 'Grok 2',
        provider: 'xai',
        profile: 'advanced',
        description: 'Frontier AI model developed by xAI.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    enabled: true,
    adapter: 'openrouter',
    keyRequired: true,
    badge: 'Available',
    docUrl: 'https://openrouter.ai/docs/quickstart',
    models: [
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'openrouter',
        profile: 'balanced',
        description: 'Flagship open-weight 70B model with GPT-4-class coding and reasoning.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct',
        name: 'Qwen 2.5 Coder 32B',
        provider: 'openrouter',
        profile: 'advanced',
        description: 'Dedicated competitive coding open-weights model by Alibaba Cloud.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'openrouter/free',
        name: 'OpenRouter Auto Free Router',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Automatically routes to active zero-cost models on OpenRouter with smart load balancing.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B Instruct (Free)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Lightweight free-tier instruction model by Meta on OpenRouter.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini (OpenRouter)',
        provider: 'openrouter',
        profile: 'fast',
        description: 'Ultra fast and cost-effective OpenAI model routed via OpenRouter.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3 (OpenRouter)',
        provider: 'openrouter',
        profile: 'balanced',
        description: 'High-performance coding intelligence via OpenRouter gateway.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  mock: {
    id: 'mock',
    name: 'Mock Engine',
    enabled: true,
    adapter: 'mock',
    keyRequired: false,
    badge: 'Offline / Dev',
    models: [
      {
        id: 'mock-deterministic-v1',
        name: 'Offline Mock Engine',
        provider: 'mock',
        profile: 'fast',
        isFree: true,
        description: 'Deterministic offline development engine.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      }
    ]
  }
};

export class ProviderRegistryService {
  public static getAllProviders(): ProviderConfig[] {
    return Object.values(PROVIDER_REGISTRY);
  }

  public static getEnabledProviders(): ProviderConfig[] {
    return Object.values(PROVIDER_REGISTRY).filter((p) => p.enabled);
  }

  public static getProvider(id: AIProviderId): ProviderConfig | undefined {
    return PROVIDER_REGISTRY[id];
  }

  public static getFreeModels(): ModelOption[] {
    const freeModels: ModelOption[] = [];
    for (const provider of Object.values(PROVIDER_REGISTRY)) {
      for (const model of provider.models) {
        if (model.isFree || model.profile === 'free') {
          freeModels.push(model);
        }
      }
    }
    return freeModels;
  }

  public static getModelsByProfile(profile: 'fast' | 'balanced' | 'advanced' | 'free'): ModelOption[] {
    const list: ModelOption[] = [];
    for (const provider of Object.values(PROVIDER_REGISTRY)) {
      if (provider.enabled) {
        for (const model of provider.models) {
          if (model.profile === profile) {
            list.push(model);
          }
        }
      }
    }
    return list;
  }

  public static getDefaultModelForProvider(providerId: AIProviderId): string {
    const provider = PROVIDER_REGISTRY[providerId];
    if (provider && provider.models.length > 0) {
      return provider.models[0].id;
    }
    return 'gemini-3.5-flash';
  }
}

