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
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        provider: 'gemini',
        profile: 'fast',
        description: 'Google’s next-gen ultra-fast, high-quota standard production model.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'gemini',
        profile: 'fast',
        description: 'Google’s high-throughput cloud model.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    enabled: true,
    adapter: 'anthropic',
    keyRequired: true,
    badge: 'Available',
    docUrl: 'https://platform.claude.com/docs/en/home',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        profile: 'advanced',
        description: 'Industry-standard coding model with superior reasoning and refactoring depth.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        provider: 'anthropic',
        profile: 'advanced',
        description: 'Anthropic hybrid reasoning model for hard algorithms and complex logic.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        profile: 'fast',
        description: 'High-speed coding model for snappy code fixes and explanations.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    enabled: true,
    adapter: 'deepseek',
    keyRequired: true,
    badge: 'Available',
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
      },
      {
        id: 'deepseek-flash',
        name: 'DeepSeek Flash',
        provider: 'deepseek',
        profile: 'fast',
        description: 'Ultra-fast, cost-effective coding engine.',
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
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (BYOK)',
        provider: 'openrouter',
        profile: 'advanced',
        description: 'Industry-leading coding model on OpenRouter with superior algorithmic and architectural reasoning.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'anthropic/claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet (BYOK)',
        provider: 'openrouter',
        profile: 'advanced',
        description: 'Anthropic flagship with hybrid reasoning for deep competitive programming solutions.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'openai/gpt-4o',
        name: 'OpenAI GPT-4o (BYOK)',
        provider: 'openrouter',
        profile: 'balanced',
        description: 'Flagship omni model with advanced coding, debugging, and multi-file analysis.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'OpenAI GPT-4o Mini (BYOK)',
        provider: 'openrouter',
        profile: 'fast',
        description: 'Ultra-fast, cost-effective coding model on OpenRouter.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3 (BYOK)',
        provider: 'openrouter',
        profile: 'balanced',
        description: 'State-of-the-art open weights coding model via OpenRouter.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'deepseek/deepseek-r1',
        name: 'DeepSeek R1 (BYOK)',
        provider: 'openrouter',
        profile: 'advanced',
        description: 'Frontier chain-of-thought reasoning model for hard algorithms.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct (BYOK)',
        provider: 'openrouter',
        profile: 'balanced',
        description: 'Flagship open-weight 70B model with GPT-4-class coding and reasoning.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 4096 }
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct',
        name: 'Qwen 2.5 Coder 32B (BYOK)',
        provider: 'openrouter',
        profile: 'advanced',
        description: 'Dedicated competitive coding open-weights model by Alibaba Cloud.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash (BYOK)',
        provider: 'openrouter',
        profile: 'fast',
        description: 'High-speed multimodal and coding model by Google.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'cohere/north-mini-code:free',
        name: 'Cohere North Mini Code (#1 Best Coding)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Specialized for agentic software engineering, terminal tasks, tool calling & reasoning. 256K context.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'recursive/flint-v1.0:free',
        name: 'Recursive Flint (#2 Agentic)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Deep codebase investigation, bug fixing, feature implementation & test generation. 262K context.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        name: 'NVIDIA Nemotron 3 Ultra (#3 Reasoning)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Complex reasoning, multi-step coding agents, task planning & orchestration. 1M context.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'nvidia/nemotron-3.5-super-vl:free',
        name: 'NVIDIA Nemotron 3.5 Super VL (#4 Vision/Code)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Visual understanding, browser DOM/GUI analysis & coding validation. 1M context.',
        capabilities: { codeGeneration: true, codeExplanation: true, projectAnalysis: true, structuredJson: true, maxOutputTokens: 8192 }
      },
      {
        id: 'dots-studio/dots-3-note-preview:free',
        name: 'Dots3-Note Preview (#5 Multimodal)',
        provider: 'openrouter',
        profile: 'free',
        isFree: true,
        description: 'Coding, reasoning, multimodal understanding & multi-step agent workflows. 512K context.',
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

  public static getByokModels(providerId: AIProviderId): ModelOption[] {
    const provider = PROVIDER_REGISTRY[providerId];
    if (!provider) return [];
    const byok = provider.models.filter((m) => !m.isFree && m.profile !== 'free');
    return byok.length > 0 ? byok : provider.models;
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

  public static getDefaultModelForProvider(providerId: AIProviderId, mode: 'managed' | 'byok' | 'free' = 'byok'): string {
    const provider = PROVIDER_REGISTRY[providerId];
    if (!provider || provider.models.length === 0) {
      return 'gemini-3.8-flash';
    }
    if (mode === 'free') {
      const free = provider.models.find((m) => m.isFree || m.profile === 'free');
      return free ? free.id : provider.models[0].id;
    }
    const byok = provider.models.find((m) => !m.isFree && m.profile !== 'free');
    return byok ? byok.id : provider.models[0].id;
  }
}

