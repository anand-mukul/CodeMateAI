import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Server,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Key,
  Globe,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  Palette,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AISystemService } from '../services/api';
import { AIStatusResponseDTO } from '../types/ai';
import { StorageService, AIMode, UserSettings } from '../services/storage';
import { PROVIDER_REGISTRY, ProviderRegistryService } from '../services/provider-registry';
import { AIProviderId } from '../types/providers';
import { useTheme, THEME_OPTIONS } from '../context/ThemeContext';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBaseUrl: string;
  onSaveBaseUrl: (url: string) => void;
  activeProvider: string;
  onSelectProvider: (provider: string) => void;
  aiStatus: AIStatusResponseDTO | null;
  onRefreshStatus: () => Promise<void>;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  currentBaseUrl,
  onSaveBaseUrl,
  activeProvider,
  onSelectProvider,
  aiStatus,
  onRefreshStatus,
}) => {
  const { theme, setTheme } = useTheme();
  const { subscription } = useAuth();
  const hasByok = subscription?.entitlements?.includes('byok') ?? false;

  // Mode: Managed AI vs Bring Your Own Key vs Free & Open Models
  const [aiMode, setAiMode] = useState<AIMode>('managed');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');

  // BYOK Vault State
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [byokVault, setByokVault] = useState<Record<string, string>>({});

  // Backend URL & Diagnostics
  const [urlInput, setUrlInput] = useState(currentBaseUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    StorageService.getSettings().then((s: UserSettings) => {
      setAiMode(s.aiMode || 'managed');
      const prov = (s.activeProvider || activeProvider || 'gemini') as AIProviderId;
      setSelectedProvider(prov);
      setSelectedModel(s.selectedModel || 'gemini-3.5-flash');
      setByokVault(s.byokVault || {});
      if (s.byokVault && s.byokVault[prov.toLowerCase()]) {
        setKeyInput(s.byokVault[prov.toLowerCase()]);
      }
    });
  }, [isOpen, activeProvider]);

  // When selected provider changes in BYOK mode, populate key from vault
  useEffect(() => {
    const existingKey = byokVault[selectedProvider.toLowerCase()] || '';
    setKeyInput(existingKey);
    const provConfig = PROVIDER_REGISTRY[selectedProvider];
    if (provConfig && provConfig.models.length > 0) {
      if (!provConfig.models.some((m) => m.id === selectedModel)) {
        setSelectedModel(provConfig.models[0].id);
      }
    }
  }, [selectedProvider, byokVault]);

  if (!isOpen) return null;

  const handleSaveMode = async (mode: AIMode) => {
    setAiMode(mode);
    let targetProvider: AIProviderId = selectedProvider;
    let targetModel = selectedModel;

    if (mode === 'managed') {
      targetProvider = 'gemini';
      targetModel = 'gemini-3.5-flash';
    } else if (mode === 'free') {
      targetProvider = 'mock';
      targetModel = 'mock-deterministic-v1';
    }

    setSelectedProvider(targetProvider);
    setSelectedModel(targetModel);
    onSelectProvider(targetProvider);

    await StorageService.saveSettings({
      aiMode: mode,
      activeProvider: targetProvider,
      selectedModel: targetModel,
    });
    await onRefreshStatus();
  };

  const handleSelectModel = async (modelId: string, providerId: AIProviderId) => {
    setSelectedModel(modelId);
    setSelectedProvider(providerId);
    onSelectProvider(providerId);

    await StorageService.saveSettings({
      selectedModel: modelId,
      activeProvider: providerId,
    });
  };

  const handleSaveByokKey = async () => {
    if (!keyInput.trim()) return;
    await StorageService.saveByokKey(selectedProvider, keyInput.trim());
    setByokVault((prev) => ({ ...prev, [selectedProvider.toLowerCase()]: keyInput.trim() }));
    setTestResult({
      success: true,
      message: `API key saved to vault for ${PROVIDER_REGISTRY[selectedProvider]?.name || selectedProvider}.`,
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = StorageService.sanitizeBackendUrl(urlInput.trim());
      AISystemService.setBaseUrl(cleanUrl);

      // Temporarily save active settings to test live request
      await StorageService.saveSettings({
        backendUrl: cleanUrl,
        activeProvider: selectedProvider,
        selectedModel: selectedModel,
        aiMode,
      });

      const status = await AISystemService.getStatus(selectedProvider);
      setTestResult({
        success: status.available,
        message: status.available
          ? `Connected successfully! Provider: ${status.provider} • Model: ${status.model}`
          : `Provider error: ${status.details?.error || 'Unavailable or invalid key'}`,
      });
      await onRefreshStatus();
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndClose = async () => {
    const cleanUrl = StorageService.sanitizeBackendUrl(urlInput.trim());
    await StorageService.saveSettings({
      backendUrl: cleanUrl,
      aiMode,
      activeProvider: selectedProvider,
      selectedModel,
    });
    onSaveBaseUrl(cleanUrl);
    onSelectProvider(selectedProvider);
    onClose();
  };

  const currentProviderConfig = PROVIDER_REGISTRY[selectedProvider];
  const freeModels = ProviderRegistryService.getFreeModels();

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl text-xs font-sans animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer mr-0.5"
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-white text-xs">AI Provider & Settings</h2>
            <p className="text-[10px] text-slate-400">Configure models, keys & backends</p>
          </div>
        </div>
        <button
          onClick={handleSaveAndClose}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
        >
          Save & Done
        </button>
      </div>

      {/* 3 AI Modes Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => handleSaveMode('managed')}
            className={`py-2 px-2.5 rounded-lg font-medium text-center transition-all flex flex-col items-center gap-1 ${
              aiMode === 'managed'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold text-[11px]">Managed AI</span>
            </div>
            <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
              Recommended
            </span>
          </button>

          <button
            onClick={() => handleSaveMode('byok')}
            className={`py-2 px-2.5 rounded-lg font-medium text-center transition-all flex flex-col items-center gap-1 ${
              aiMode === 'byok'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-300" />
              <span className="font-semibold text-[11px]">Bring Your Key</span>
              {!hasByok && <Lock className="w-2.5 h-2.5 text-amber-400" />}
            </div>
            <span className="text-[9px] text-slate-400">
              {!hasByok ? 'AutoPilot Pass Only' : 'Personal Accounts'}
            </span>
          </button>

          <button
            onClick={() => handleSaveMode('free')}
            className={`py-2 px-2.5 rounded-lg font-medium text-center transition-all flex flex-col items-center gap-1 ${
              aiMode === 'free'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-semibold text-[11px]">Free & Open</span>
            </div>
            <span className="text-[9px] text-slate-400">Zero Cost Models</span>
          </button>
        </div>

        {/* MODE 1: MANAGED AI */}
        {aiMode === 'managed' && (
          <div className="flex flex-col gap-3 p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-semibold text-xs flex items-center gap-1.5">
                  Managed Cloud AI
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                    Active Subscription
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Use high-performance AI included with your CodeMate plan. No API key required.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero configuration required</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Managed usage limits</span>
              </div>
            </div>

            {/* Model Profile Selector */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[11px] font-semibold text-slate-300">Model Speed & Intelligence:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gemini-3.5-flash', name: 'Fast', sub: 'Standard & High Quota', profile: 'fast' },
                  { id: 'gemini-3.5-flash-lite', name: 'Lite', sub: 'Ultra Low Latency', profile: 'lite' },
                  { id: 'gemini-3.8-flash', name: 'Balanced', sub: 'High Reasoning', profile: 'balanced' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id, 'gemini')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      selectedModel === m.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[11px]">
                      {m.name}
                      {selectedModel === m.id && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{m.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: BRING YOUR OWN KEY (BYOK) */}
        {aiMode === 'byok' && (
          <div className="flex flex-col gap-3">
            {!hasByok && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-start gap-2.5 text-[11px]">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-amber-300">BYOK Access Requires AutoPilot Pass (₹40/day)</span>
                  <span className="text-slate-300 leading-tight">
                    Custom API keys for unlimited requests with your personal provider accounts are unlocked with the AutoPilot Pass. The Core Pass (₹20/day) includes 25 requests/day using managed high-speed AI.
                  </span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-white font-semibold text-xs">Connect Personal Provider Account</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Use your personal API keys. Keys are securely stored in your local browser vault.
              </p>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'openai', name: 'OpenAI', badge: 'Available', enabled: true },
                { id: 'gemini', name: 'Google Gemini', badge: 'Available', enabled: true },
                { id: 'openrouter', name: 'OpenRouter', badge: 'Available', enabled: true },
                { id: 'anthropic', name: 'Claude', badge: 'Coming Soon', enabled: false },
                { id: 'deepseek', name: 'DeepSeek', badge: 'Coming Soon', enabled: false },
                { id: 'xai', name: 'Grok', badge: 'Coming Soon', enabled: false },
              ].map((p) => {
                const isSelected = selectedProvider === p.id;
                const hasKey = !!byokVault[p.id.toLowerCase()];
                return (
                  <button
                    key={p.id}
                    disabled={!p.enabled}
                    onClick={() => p.enabled && setSelectedProvider(p.id as AIProviderId)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      !p.enabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800/50'
                        : isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">{p.name}</span>
                      {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Key Configured" />}
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded w-max font-mono ${
                        p.enabled
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Key Input & Model for Selected Provider */}
            {currentProviderConfig && currentProviderConfig.enabled && (
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-2.5 mt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-200">
                    {currentProviderConfig.name} API Key:
                  </label>
                  {currentProviderConfig.docUrl && (
                    <a
                      href={currentProviderConfig.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder={`Enter your ${currentProviderConfig.name} key...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-200 outline-none focus:border-indigo-500 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveByokKey}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-[11px] transition-colors shrink-0"
                  >
                    Save Key
                  </button>
                </div>

                {/* Model Selector for Selected Provider */}
                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-[11px] font-medium text-slate-300">Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleSelectModel(e.target.value, selectedProvider)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-sans text-[11px] text-slate-200 outline-none focus:border-indigo-500"
                  >
                    {currentProviderConfig.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.profile})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: FREE & OPEN MODELS */}
        {aiMode === 'free' && (
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-white font-semibold text-xs">Discover Free & Open-Weight Models</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Models with no per-token charge. Availability and throughput depend on public server load.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {freeModels.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id, m.provider)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-600/25 border-indigo-500 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">{m.name}</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                          Free Tier
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{m.description}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Connection Diagnostics Card */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Active Engine:</span>
            <span className="font-mono text-indigo-300 font-semibold uppercase">{selectedProvider}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Selected Model:</span>
            <span className="font-mono text-slate-300 truncate max-w-[240px]">{selectedModel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Connection:</span>
            <span
              className={`font-semibold ${
                aiStatus?.available ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {aiStatus?.available ? 'Connected' : 'Standby / Check Key'}
            </span>
          </div>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-2.5 rounded-xl text-[11px] leading-tight flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}
          >
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* THEME & APPEARANCE SELECTOR */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Theme & Appearance</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {THEME_OPTIONS.find((t) => t.id === theme)?.name}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {THEME_OPTIONS.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                  title={`${t.name}: ${t.description}`}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center border shadow-sm"
                    style={{ backgroundColor: t.previewBg, borderColor: isSelected ? t.previewAccent : 'rgba(255,255,255,0.15)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.previewAccent }} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-200 truncate w-full">
                    {t.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced Backend Connection */}
        <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between py-1"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5" />
              Advanced Backend Connection
            </span>
            <span>{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-2 p-2.5 bg-slate-900/50 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-300">FastAPI Host:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-200 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setUrlInput('http://127.0.0.1:8000')}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSaveAndClose}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl transition-all shadow-md text-[11px]"
          >
            Done & Apply
          </button>
        </div>
      </div>
  );
};

export default AISettingsModal;
