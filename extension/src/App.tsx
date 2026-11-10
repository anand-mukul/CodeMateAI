import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ProblemCard } from './components/ProblemCard';
import { SmartClipboard } from './components/SmartClipboard';
import { AIActions } from './components/AIActions';
import { AISettingsModal } from './components/AISettingsModal';
import { LoadingState } from './components/LoadingState';
import { useEditorStatus } from './hooks/useEditorStatus';
import { AISystemService } from './services/api';
import { StorageService, AIMode } from './services/storage';
import { AIStatusResponseDTO } from './types/ai';
import { Sparkles, ClipboardList, Zap, Lock, ArrowLeft } from 'lucide-react';
import { ReliabilityEngine } from './services/reliability-engine';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AccountView } from './components/AccountView';
import { AuthGate } from './components/AuthGate';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { SafeAutoPilot } from './components/SafeAutoPilot';
import { Toast, ToastNotification } from './components/Toast';
import { AnalyticsService } from './services/analytics-service';
import { AuthService } from './services/auth-service';

export interface AppProps {
  isSidePanel?: boolean;
}

type SubView = 'code' | 'autopilot' | 'clipboard' | 'full_account';

const AppContent: React.FC<AppProps> = ({ isSidePanel = false }) => {
  const {
    editorStatus,
    problemContext,
    isSupportedPage,
    loading,
    refreshStatus,
  } = useEditorStatus();

  const { user, subscription, refreshAuth, logout } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isPrivileged = userRole === 'ADMIN';
  const hasAutopilot = isPrivileged || (subscription?.entitlements?.includes('autopilot') ?? false);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('C++');
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Backend & AI Status
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string>('openrouter');
  const [aiMode, setAiMode] = useState<AIMode>('free');
  const [aiStatus, setAiStatus] = useState<AIStatusResponseDTO | null>(null);

  // In-flow settings drawer (replaces popups/clipping modals)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 3 Core navigation tabs: Practice | Assistant | Clipboard
  const [activeSubView, setActiveSubView] = useState<SubView>('code');

  // Auto-sync selected language with detected problem language
  useEffect(() => {
    if (problemContext?.language && problemContext.language !== 'Unknown') {
      setSelectedLanguage(problemContext.language);
    }
  }, [problemContext?.language]);

  useEffect(() => {
    AnalyticsService.init();
  }, []);

  const showToast = useCallback((message: string, isError = false) => {
    setActiveToast({ message, isError });
  }, []);

  const handleDismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const checkBackendStatus = useCallback(async () => {
    try {
      const s = await StorageService.getSettings();
      setAiMode(s.aiMode);

      let isHealthy = false;
      try {
        const health = await AISystemService.getHealth();
        isHealthy = health.status === 'healthy';
      } catch {
        // Windows IPv4/IPv6 Fallback: If localhost failed, test 127.0.0.1
        const currentUrl = AISystemService.getBaseUrl();
        if (currentUrl.includes('localhost')) {
          try {
            const fallbackUrl = currentUrl.replace('localhost', '127.0.0.1');
            AISystemService.setBaseUrl(fallbackUrl);
            AuthService.setBaseUrl(fallbackUrl);
            const health = await AISystemService.getHealth();
            isHealthy = health.status === 'healthy';
          } catch {}
        }
      }

      setBackendOnline(isHealthy);
      ReliabilityEngine.updateSystemStatus(isHealthy, activeProvider);

      if (!isHealthy) {
        setAiStatus(null);
        return;
      }

      // Check provider AI status independently without pulling backend offline
      try {
        const status = await AISystemService.getStatus(s.aiMode === 'managed' ? undefined : activeProvider);
        setAiStatus(status);
      } catch (aiErr) {
        console.warn('[CodeMate AI] AI provider status check warning:', aiErr);
        setAiStatus(null);
      }
    } catch {
      setBackendOnline(false);
      setAiStatus(null);
      ReliabilityEngine.updateSystemStatus(false, activeProvider);
    }
  }, [activeProvider]);

  useEffect(() => {
    StorageService.getSettings().then(async (s) => {
      const defaultUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const activeUrl = s.backendUrl || defaultUrl;
      AISystemService.setBaseUrl(activeUrl);
      AuthService.setBaseUrl(activeUrl);
      setActiveProvider(s.activeProvider);
      setAiMode(s.aiMode);
      checkBackendStatus();
    });
  }, [checkBackendStatus]);

  const handleFullRefresh = () => {
    refreshStatus();
    refreshAuth();
    checkBackendStatus();
  };

  const getFooterAIStatus = () => {
    if (!backendOnline) return 'Offline';
    if (aiMode === 'managed') return 'Connected';
    switch (activeProvider?.toLowerCase()) {
      case 'deepseek':
        return 'DeepSeek connected';
      case 'gemini':
        return 'Gemini connected';
      case 'openai':
        return 'OpenAI connected';
      case 'openrouter':
        return 'OpenRouter connected';
      default:
        return 'Connected';
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-3 flex flex-col gap-2.5 select-none font-sans">
      {/* Clean, Single-Row Header */}
      <Header
        onRefresh={handleFullRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        planName={isPrivileged ? 'Admin Pass' : (subscription?.plan_name || 'Free')}
        isLoading={loading}
        isSidePanel={isSidePanel}
      />

      {/* Settings Drawer (Raycast/Linear UX: Manage AI | Account & Preferences) */}
      {isSettingsOpen ? (
        <div className="flex-1 flex flex-col animate-fade-in pb-2">
          <AISettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            activeProvider={activeProvider}
            onSelectProvider={(p) => {
              if (p !== activeProvider) {
                setActiveProvider(p);
                showToast(`Switched provider to ${p}`);
              }
            }}
            aiStatus={aiStatus}
            onRefreshStatus={checkBackendStatus}
            onOpenFullAccount={() => setActiveSubView('full_account')}
          />
        </div>
      ) : loading && !editorStatus && activeSubView === 'code' ? (
        <LoadingState message="Connecting to CodeChef practice editor & AI backend..." />
      ) : !user ? (
        <AuthGate onNotify={showToast} />
      ) : !user.email_verified && activeSubView !== 'full_account' ? (
        <EmailVerificationGate
          user={user}
          onVerified={refreshAuth}
          onNotify={showToast}
          onLogout={logout}
        />
      ) : (
        <main className="flex flex-col gap-2.5">
          {/* Active Problem Card (shown on Practice and Assistant tabs) */}
          {(activeSubView === 'code' || activeSubView === 'autopilot') && (
            <ProblemCard
              problem={problemContext}
              isSupported={isSupportedPage}
              onRefresh={handleFullRefresh}
              isLoading={loading}
            />
          )}

          {/* 3 Core Tabs: Practice | Assistant | Clipboard */}
          {activeSubView !== 'full_account' && (
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setActiveSubView('code')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeSubView === 'code'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>Practice</span>
              </button>

              <button
                onClick={() => setActiveSubView('autopilot')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeSubView === 'autopilot'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Assistant</span>
                {!hasAutopilot && (
                  <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => setActiveSubView('clipboard')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeSubView === 'clipboard'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Clipboard</span>
              </button>
            </div>
          )}

          {/* Tab 1: AI Code Practice (Generate & Optimize) */}
          {activeSubView === 'code' && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              <AIActions
                problemContext={problemContext}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                providerOverride={aiMode === 'managed' ? undefined : activeProvider}
                onNotify={showToast}
              />
            </div>
          )}

          {/* Tab 2: CodeMate Assistant (Safe AutoPilot) */}
          {activeSubView === 'autopilot' && (
            <div className="animate-fade-in">
              <SafeAutoPilot
                problemContext={problemContext}
                selectedLanguage={selectedLanguage}
                providerOverride={aiMode === 'managed' ? undefined : activeProvider}
                onNotify={showToast}
              />
            </div>
          )}

          {/* Tab 3: Smart Clipboard */}
          {activeSubView === 'clipboard' && (
            <div className="animate-fade-in">
              <SmartClipboard
                onNotify={showToast}
              />
            </div>
          )}

          {/* Full Account & Devices Detail View (accessible via Settings) */}
          {activeSubView === 'full_account' && (
            <div className="animate-fade-in flex flex-col gap-2.5">
              <button
                onClick={() => setActiveSubView('code')}
                className="self-start text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 transition-all font-medium cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Practice</span>
              </button>
              <AccountView onNotify={showToast} />
            </div>
          )}
        </main>
      )}

      {/* Auto-Dismissing Toast */}
      <Toast
        notification={activeToast}
        onDismiss={handleDismissToast}
        duration={2800}
      />

      {/* Calm, Utilitarian Footer */}
      <footer className="pt-2 mt-auto border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate max-w-[190px]" title={user?.email || 'Guest'}>
          {user?.email ? user.email.split('@')[0] : 'Guest'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendOnline ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-400 font-normal">
            {getFooterAIStatus()}
          </span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC<AppProps> = ({ isSidePanel = false }) => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent isSidePanel={isSidePanel} />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
