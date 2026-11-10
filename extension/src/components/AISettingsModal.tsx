import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  LogOut,
  CreditCard,
  Settings2,
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
  activeProvider: string;
  onSelectProvider: (provider: string) => void;
  aiStatus: AIStatusResponseDTO | null;
  onRefreshStatus: () => Promise<void>;
  onOpenFullAccount?: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onSelectProvider,
  aiStatus: _aiStatus,
  onRefreshStatus,
  onOpenFullAccount,
}) => {
  const { theme, setTheme } = useTheme();
  const { user, subscription, logout } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isPrivileged = userRole === 'ADMIN';
  const planId = (subscription?.plan_id || '').toUpperCase();
  const isFreeUser = !isPrivileged && (planId === 'FREE' || !planId);
  const hasByok = isPrivileged || planId === 'PLAN_AUTOPILOT_PASS' || (subscription?.entitlements?.includes('byok') ?? false);

  // Settings Top Tab: 'ai' | 'account'
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'account'>('ai');

  // Mode: Managed vs BYOK vs Free
  const [aiMode, setAiMode] = useState<AIMode>(isFreeUser ? 'free' : 'managed');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(isFreeUser ? 'openrouter' : 'deepseek');
  const [selectedModel, setSelectedModel] = useState<string>(isFreeUser ? 'cohere/north-mini-code:free' : 'deepseek-flash');

  // BYOK Vault State
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [byokVault, setByokVault] = useState<Record<string, string>>({});

  // Connection Diagnostics
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    StorageService.getSettings().then((s: UserSettings) => {
      let mode = s.aiMode || (isFreeUser ? 'free' : 'managed');
      let prov = (s.activeProvider || (isFreeUser ? 'openrouter' : 'deepseek')) as AIProviderId;
      let model = s.selectedModel;

      if (isFreeUser && mode === 'managed') {
        mode = 'free';
        prov = 'openrouter';
      }

      if (mode === 'free') {
        const freeModels = ProviderRegistryService.getFreeModels();
        if (!model || !freeModels.some((m) => m.id === model)) {
          model = 'cohere/north-mini-code:free';
        }
      } else if (mode === 'byok') {
        const byokModels = ProviderRegistryService.getByokModels(prov);
        if (!model || model.includes(':free') || !byokModels.some((m) => m.id === model)) {
          model = ProviderRegistryService.getDefaultModelForProvider(prov, 'byok');
        }
      } else {
        if (!model) {
          model = ProviderRegistryService.getDefaultModelForProvider(prov, 'managed');
        }
      }

      setAiMode(mode);
      setSelectedProvider(prov);
      setSelectedModel(model);
      setByokVault(s.byokVault || {});
      if (s.byokVault && s.byokVault[prov.toLowerCase()]) {
        setKeyInput(s.byokVault[prov.toLowerCase()]);
      }
    });
  }, [isOpen, activeProvider, isFreeUser]);

  useEffect(() => {
    const existingKey = byokVault[selectedProvider.toLowerCase()] || '';
    setKeyInput(existingKey);
    if (aiMode === 'byok') {
      const byokModels = ProviderRegistryService.getByokModels(selectedProvider);
      if (byokModels.length > 0 && (!selectedModel || selectedModel.includes(':free') || !byokModels.some((m) => m.id === selectedModel))) {
        setSelectedModel(byokModels[0].id);
      }
    } else if (aiMode === 'free') {
      const freeModels = ProviderRegistryService.getFreeModels();
      if (!selectedModel || !freeModels.some((m) => m.id === selectedModel)) {
        setSelectedModel('cohere/north-mini-code:free');
      }
    } else {
      const provConfig = PROVIDER_REGISTRY[selectedProvider];
      if (provConfig && provConfig.models.length > 0) {
        if (!provConfig.models.some((m) => m.id === selectedModel)) {
          setSelectedModel(provConfig.models[0].id);
        }
      }
    }
  }, [selectedProvider, byokVault, aiMode]);

  if (!isOpen) return null;

  const handleSaveMode = async (mode: AIMode) => {
    if (mode === 'managed' && isFreeUser) return;
    if (mode === 'byok' && !hasByok) return;

    setAiMode(mode);
    setTestResult(null);

    if (mode === 'managed') {
      await StorageService.saveSettings({
        aiMode: mode,
      });
      await onRefreshStatus();
      return;
    }

    let targetProvider: AIProviderId = selectedProvider;
    let targetModel = selectedModel;

    if (mode === 'free') {
      targetProvider = 'openrouter';
      targetModel = 'cohere/north-mini-code:free';
    } else if (mode === 'byok') {
      const byokModels = ProviderRegistryService.getByokModels(targetProvider);
      if (byokModels.length > 0 && (!targetModel || targetModel.includes(':free') || !byokModels.some((m) => m.id === targetModel))) {
        targetModel = byokModels[0].id;
      }
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

  const handleProviderChange = async (providerId: AIProviderId) => {
    setSelectedProvider(providerId);
    const existingKey = byokVault[providerId.toLowerCase()] || '';
    setKeyInput(existingKey);
    setTestResult(null);

    const byokModels = ProviderRegistryService.getByokModels(providerId);
    let nextModel = selectedModel;
    if (byokModels.length > 0 && (!nextModel || nextModel.includes(':free') || !byokModels.some((m) => m.id === nextModel))) {
      nextModel = byokModels[0].id;
      setSelectedModel(nextModel);
    }

    await StorageService.saveSettings({
      activeProvider: providerId,
      selectedModel: nextModel,
      aiMode: 'byok',
    });
    onSelectProvider(providerId);
  };

  const handleSelectModel = async (modelId: string, providerId: AIProviderId) => {
    setSelectedModel(modelId);
    setSelectedProvider(providerId);
    onSelectProvider(providerId);

    await StorageService.saveSettings({
      selectedModel: modelId,
      activeProvider: providerId,
      aiMode,
    });
  };

  const handleSaveByokKey = async () => {
    if (!keyInput.trim()) return;
    await StorageService.saveByokKey(selectedProvider, keyInput.trim());
    setByokVault((prev) => ({ ...prev, [selectedProvider.toLowerCase()]: keyInput.trim() }));
    setTestResult({
      success: true,
      message: `API key saved for ${PROVIDER_REGISTRY[selectedProvider]?.name || selectedProvider}`,
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const trimmedKey = keyInput.trim();
      if (trimmedKey) {
        await StorageService.saveByokKey(selectedProvider, trimmedKey);
        setByokVault((prev) => ({ ...prev, [selectedProvider.toLowerCase()]: trimmedKey }));
      }

      await StorageService.saveSettings({
        activeProvider: selectedProvider,
        selectedModel: selectedModel,
        aiMode,
      });

      const sanitizeMessage = (raw: string | undefined): string => {
        if (!raw) return 'Check key and permissions';
        return raw
          .replace(/https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/gi, 'CodeMate AI service')
          .replace(/\bport \d+\b/gi, 'service port')
          .replace(/\bbackend\/\.env\b/gi, 'Settings')
          .replace(/Python server/gi, 'backend service');
      };

      const status = await AISystemService.getStatus(selectedProvider, selectedModel);
      const errStr = typeof status.details?.error === 'string' ? status.details.error : undefined;
      setTestResult({
        success: status.available,
        message: status.available
          ? `Connected to ${PROVIDER_REGISTRY[selectedProvider]?.name || selectedProvider} (${selectedModel})`
          : sanitizeMessage(errStr),
      });
      await onRefreshStatus();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Connection failed';
      const cleanMsg = rawMsg
        .replace(/https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/gi, 'CodeMate AI service')
        .replace(/\bport \d+\b/gi, 'service port')
        .replace(/\bbackend\/\.env\b/gi, 'Settings')
        .replace(/Python server/gi, 'backend service');
      setTestResult({
        success: false,
        message: cleanMsg,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndClose = async () => {
    await StorageService.saveSettings({
      aiMode,
      activeProvider: selectedProvider,
      selectedModel,
    });
    if (aiMode !== 'managed' && selectedProvider !== activeProvider) {
      onSelectProvider(selectedProvider);
    }
    onClose();
  };

  const currentProviderConfig = PROVIDER_REGISTRY[selectedProvider];
  const freeModels = ProviderRegistryService.getFreeModels();
  const byokModels = ProviderRegistryService.getByokModels(selectedProvider);
  const portalUrl = (import.meta as any).env?.VITE_WEB_PORTAL_URL || 'http://localhost:3000';

  const planDisplayName = isPrivileged
    ? 'Admin pass'
    : planId === 'PLAN_AUTOPILOT_PASS'
    ? 'AutoPilot pass'
    : planId === 'PLAN_CORE_PASS'
    ? 'Core pass'
    : 'Free tier';

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3 text-xs font-sans text-slate-200 shadow-xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer mr-0.5"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-white text-xs">Settings</span>
        </div>
        <button
          onClick={handleSaveAndClose}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>

      {/* Segmented Tabs: Model | Account */}
      <div className="flex items-center p-0.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveSettingsTab('ai')}
          className={`flex-1 py-1.5 text-center font-medium rounded-md transition-all ${
            activeSettingsTab === 'ai'
              ? 'bg-slate-800 text-white shadow-xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Model settings
        </button>

        <button
          onClick={() => setActiveSettingsTab('account')}
          className={`flex-1 py-1.5 text-center font-medium rounded-md transition-all ${
            activeSettingsTab === 'account'
              ? 'bg-slate-800 text-white shadow-xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Account & appearance
        </button>
      </div>

      {/* TAB 1: MODEL SETTINGS */}
      {activeSettingsTab === 'ai' && (
        <div className="flex flex-col gap-2.5">
          {/* 3 Modes */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs">
            <button
              onClick={() => handleSaveMode('managed')}
              className={`py-1.5 px-1 rounded-md text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                aiMode === 'managed'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Included cloud</span>
                {isFreeUser && <Lock className="w-2.5 h-2.5 text-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-500">
                {isFreeUser ? 'Pass required' : 'Recommended'}
              </span>
            </button>

            <button
              onClick={() => handleSaveMode('byok')}
              className={`py-1.5 px-1 rounded-md text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                aiMode === 'byok'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Personal keys</span>
                {!hasByok && <Lock className="w-2.5 h-2.5 text-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-500">
                {!hasByok ? 'AutoPilot only' : 'BYOK'}
              </span>
            </button>

            <button
              onClick={() => handleSaveMode('free')}
              className={`py-1.5 px-1 rounded-md text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                aiMode === 'free'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Free models</span>
              <span className="text-[10px] text-slate-500">Zero cost</span>
            </button>
          </div>

          {/* MODE: MANAGED */}
          {aiMode === 'managed' && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">Included cloud models</span>
                <span className="text-[11px] text-slate-400">{planDisplayName}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {!isFreeUser
                  ? 'High-performance models included with your pass. Managed and optimized by CodeMate for coding.'
                  : 'Included cloud models require an active Core pass (₹21/day) or AutoPilot pass (₹61/week).'}
              </p>

              {isFreeUser && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between">
                  <span>Use free models in the Free tab</span>
                  <button
                    onClick={() => handleSaveMode('free')}
                    className="text-amber-200 font-medium hover:underline text-[11px] cursor-pointer"
                  >
                    Switch →
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-850 text-[11px]">
                <span className="text-slate-400">Status</span>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* MODE: BYOK */}
          {aiMode === 'byok' && (
            <div className="flex flex-col gap-2">
              {!hasByok && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  Custom API key support requires an active AutoPilot pass.
                </div>
              )}

              {/* Providers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ProviderRegistryService.getAllProviders().map((p) => {
                  const isSelected = selectedProvider === p.id;
                  const hasKey = !!byokVault[p.id.toLowerCase()];
                  return (
                    <button
                      key={p.id}
                      disabled={!hasByok || !p.enabled}
                      onClick={() => handleProviderChange(p.id)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      <div className="font-semibold text-xs truncate">{p.name}</div>
                      <div className="text-[10px] mt-0.5">
                        {!p.enabled ? (
                          <span className="text-slate-600">Coming soon</span>
                        ) : hasKey ? (
                          <span className="text-emerald-400 font-medium">Configured</span>
                        ) : (
                          <span className="text-slate-500">No key</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Key Input */}
              {currentProviderConfig && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2.5 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        disabled={!hasByok}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder={`Paste ${currentProviderConfig.name} key...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-200 outline-none focus:border-indigo-500 pr-7 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={!hasByok}
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 disabled:opacity-40"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      disabled={!hasByok}
                      onClick={handleSaveByokKey}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-xs"
                    >
                      Save
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Model Selection</span>
                      <span className="text-[10px] text-slate-500">Active provider model</span>
                    </div>
                    <select
                      disabled={!hasByok}
                      value={selectedModel}
                      onChange={(e) => handleSelectModel(e.target.value, selectedProvider)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {byokModels.map((m) => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE: FREE */}
          {aiMode === 'free' && (
            <div className="flex flex-col gap-1.5">
              {freeModels.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id, m.provider)}
                    className={`p-2.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-slate-850 border-indigo-500 text-white'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.description}</div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Connection Test */}
          {aiMode !== 'managed' && (
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test connection'}</span>
              </button>
            </div>
          )}

          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium leading-tight shadow-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/25'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNT & APPEARANCE */}
      {activeSettingsTab === 'account' && (
        <div className="flex flex-col gap-3">
          {/* User info */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">{user?.display_name || user?.email?.split('@')[0] || 'Developer'}</div>
                <div className="text-[11px] text-slate-400">{user?.email || 'Not signed in'}</div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {planDisplayName}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[11px] text-slate-400">
              <span>Role: <span className="text-slate-200">{userRole === 'ADMIN' ? 'Admin' : 'Developer'}</span></span>
              <span>Email: <span className="text-emerald-400">{user?.email_verified ? 'Verified' : 'Unverified'}</span></span>
            </div>
          </div>

          {/* Theme selector */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">Theme</span>
              <span className="text-[11px] text-slate-400">
                {THEME_OPTIONS.find((t) => t.id === theme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {THEME_OPTIONS.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-500 bg-slate-800/90 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {/* Visual mini-window theme preview */}
                    <div
                      className="w-full h-8 rounded-md mb-2 flex flex-col overflow-hidden border shadow-inner transition-colors"
                      style={{
                        backgroundColor: t.previewBg,
                        borderColor: isSelected ? t.previewAccent : 'rgba(255,255,255,0.12)',
                      }}
                    >
                      {/* Window header dots */}
                      <div className="h-2.5 w-full flex items-center px-1.5 gap-1 border-b border-white/5" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                        <span className="w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: t.isDark ? '#64748b' : '#94a3b8' }} />
                        <span className="w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: t.isDark ? '#64748b' : '#94a3b8' }} />
                      </div>
                      {/* Content representation */}
                      <div className="flex-1 w-full px-1.5 flex items-center justify-between">
                        <div className="w-5 h-1.5 rounded-xs opacity-50" style={{ backgroundColor: t.isDark ? '#94a3b8' : '#64748b' }} />
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: t.previewAccent }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] font-medium leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {t.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-indigo-400 shrink-0 ml-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-1.5 pt-1">
            <a
              href={`${portalUrl}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-between text-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Web dashboard & billing</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            {onOpenFullAccount && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullAccount();
                }}
                className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-between text-xs cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>More settings</span>
                </div>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-slate-500" />
              </button>
            )}

            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800/80 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettingsModal;
