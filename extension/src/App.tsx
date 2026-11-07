import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ProblemCard } from './components/ProblemCard';
import { SmartClipboard } from './components/SmartClipboard';
import { AIActions } from './components/AIActions';
import { AISettingsModal } from './components/AISettingsModal';
import { LoadingState } from './components/LoadingState';
import { useEditorStatus } from './hooks/useEditorStatus';
import { AISystemService } from './services/api';
import { StorageService } from './services/storage';
import { AIStatusResponseDTO } from './types/ai';
import { Sparkles, ClipboardList, Shield, Zap, Lock, FolderGit2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ReliabilityEngine } from './services/reliability-engine';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AccountView } from './components/AccountView';
import { AuthGate } from './components/AuthGate';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { SafeAutoPilot } from './components/SafeAutoPilot';
import { ThemeModal } from './components/ThemeModal';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { AnalyticsService } from './services/analytics-service';
import { AuthService } from './services/auth-service';

export interface AppProps {
  isSidePanel?: boolean;
}

type SubView = 'code' | 'autopilot' | 'clipboard' | 'workspace' | 'account';

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
  const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT_AGENT'].includes(userRole);
  const hasAutopilot = isPrivileged || (subscription?.entitlements?.includes('autopilot') ?? false);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('C++');
  const [activeToast, setActiveToast] = useState<{ message: string; isError?: boolean } | null>(null);

  // Backend & AI Status
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string>('openrouter');
  const [aiStatus, setAiStatus] = useState<AIStatusResponseDTO | null>(null);

  // In-flow settings and theme drawers (Linear/Raycast UX)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // Core tools navigation
  const [activeSubView, setActiveSubView] = useState<SubView>('code');

  useEffect(() => {
    AnalyticsService.init();
  }, []);

  const showToast = (message: string, isError = false) => {
    setActiveToast({ message, isError });
    setTimeout(() => {
      setActiveToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const checkBackendStatus = useCallback(async () => {
    try {
      const health = await AISystemService.getHealth();
      setBackendOnline(health.status === 'healthy');
      const status = await AISystemService.getStatus(activeProvider);
      setAiStatus(status);
      ReliabilityEngine.updateSystemStatus(health.status === 'healthy', activeProvider);
    } catch {
      setBackendOnline(false);
      setAiStatus(null);
      ReliabilityEngine.updateSystemStatus(false, activeProvider);
    }
  }, [activeProvider]);

  useEffect(() => {
    StorageService.getSettings().then(async (s) => {
      let activeUrl = s.backendUrl;
      // Proactively test if local backend is running when set to default cloud
      if (!activeUrl || activeUrl.includes('onrender.com')) {
        try {
          const resp = await fetch('http://127.0.0.1:8000/api/health', {
            method: 'GET',
            signal: AbortSignal.timeout(1000),
          });
          if (resp.ok) {
            activeUrl = 'http://127.0.0.1:8000';
          }
        } catch {
          // Localhost offline, proceed with cloud
        }
      }
      AISystemService.setBaseUrl(activeUrl);
      AuthService.setBaseUrl(activeUrl);
      setActiveProvider(s.activeProvider);
      checkBackendStatus();
    });
  }, [checkBackendStatus]);

  const handleFullRefresh = () => {
    refreshStatus();
    refreshAuth();
    checkBackendStatus();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-3 flex flex-col gap-2.5 select-none font-sans">
      {/* Header with live connection status pill, user avatar, theme toggle, and sidepanel launcher */}
      <Header
        isConnected={!!problemContext && isSupportedPage}
        isSupported={isSupportedPage}
        backendOnline={backendOnline}
        activeProvider={activeProvider}
        onRefresh={handleFullRefresh}
        onOpenSettings={() => {
          setIsThemeModalOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenTheme={() => {
          setIsSettingsOpen(false);
          setIsThemeModalOpen(true);
        }}
        onOpenAccount={() => {
          setIsSettingsOpen(false);
          setIsThemeModalOpen(false);
          setActiveSubView('account');
        }}
        userEmail={user?.email}
        planName={isPrivileged ? (userRole === 'SUPER_ADMIN' ? 'Executive Admin' : 'Admin Pass') : (subscription?.plan_name || 'Free')}
        isLoading={loading}
        isSidePanel={isSidePanel}
      />

      {/* In-Flow Settings Drawer (Raycast / Linear pattern - replaces clipping modal) */}
      {isSettingsOpen ? (
        <AISettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          activeProvider={activeProvider}
          onSelectProvider={(p) => {
            setActiveProvider(p);
            showToast(`Switched provider to ${p}`);
          }}
          aiStatus={aiStatus}
          onRefreshStatus={checkBackendStatus}
        />
      ) : isThemeModalOpen ? (
        /* In-Flow Theme Palette Drawer */
        <ThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
        />
      ) : loading && !editorStatus && activeSubView === 'code' ? (
        <LoadingState message="Connecting to CodeChef practice editor & AI backend..." />
      ) : !user ? (
        <AuthGate onNotify={showToast} />
      ) : !user.email_verified && activeSubView !== 'account' ? (
        <EmailVerificationGate
          user={user}
          onVerified={refreshAuth}
          onNotify={showToast}
          onLogout={logout}
        />
      ) : (
        <main className="flex flex-col gap-2.5">
          {/* Active Problem Card (only relevant on code/autopilot tabs) */}
          {(activeSubView === 'code' || activeSubView === 'autopilot') && (
            <ProblemCard
              problem={problemContext}
              isSupported={isSupportedPage}
              onRefresh={handleFullRefresh}
              isLoading={loading}
            />
          )}

          {/* Streamlined Linear-Style Segmented Navigation Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs shadow-inner">
            <button
              onClick={() => setActiveSubView('code')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                activeSubView === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Practice</span>
            </button>

            <button
              onClick={() => setActiveSubView('autopilot')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                activeSubView === 'autopilot'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Assistant</span>
              {!hasAutopilot && (
                <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveSubView('clipboard')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                activeSubView === 'clipboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Clipboard</span>
            </button>

            {isSidePanel && (
              <button
                onClick={() => setActiveSubView('workspace')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                  activeSubView === 'workspace'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                <span>Workspace</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubView('account')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                activeSubView === 'account'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Account</span>
            </button>
          </div>

          {/* SubView 1: AI Code Assistant (Generate & Optimize with unified language selector) */}
          {activeSubView === 'code' && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              <AIActions
                problemContext={problemContext}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                providerOverride={activeProvider}
                onNotify={showToast}
              />
            </div>
          )}

          {/* SubView 2: Smart Practice Assistant */}
          {activeSubView === 'autopilot' && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              {hasAutopilot ? (
                <SafeAutoPilot
                  problemContext={problemContext}
                  selectedLanguage={selectedLanguage}
                  providerOverride={activeProvider}
                  onNotify={showToast}
                />
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Zap className="w-5 h-5 fill-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          Smart Practice Assistant
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            AutoPilot Pass Exclusive
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Iterative solving, test running & diagnostic guidance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span><strong>Guided Practice Loop:</strong> Solves, tests, identifies edge cases, and guides debugging.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span><strong>1-Click Editor Insertion:</strong> Instant Ace editor replacement with undo (Ctrl+Z) preserved.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span><strong>Full BYOK Access:</strong> Bring Your Own Key for Gemini, OpenAI & Anthropic with unlimited daily runs.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      <span><strong>100 Managed AI Requests / Day:</strong> Powered by CodeMate high-speed cloud cluster.</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-[10px] text-indigo-200">
                    Currently active plan: <strong>{subscription?.plan_name || 'Free Plan'}</strong>
                    {(subscription?.plan_id === 'PLAN_CORE_PASS' || subscription?.plan_id === 'core_daily') && ' (₹21/day Core Pass allows manual copy-paste & 25 req/day).'}
                  </div>

                  <button
                    onClick={() => setActiveSubView('account')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Upgrade to AutoPilot Pass — ₹61/week</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SubView 3: Smart Clipboard Mastery Engine */}
          {activeSubView === 'clipboard' && (
            <div className="animate-fade-in">
              <SmartClipboard
                onInsertionSuccess={refreshStatus}
                onNotify={showToast}
              />
            </div>
          )}

          {/* SubView 4: Multi-File Project Workspace (Docked in SidePanel) */}
          {activeSubView === 'workspace' && isSidePanel && (
            <div className="animate-fade-in">
              <ProjectWorkspace
                onNotify={showToast}
                userTier={subscription?.plan_id || 'free'}
              />
            </div>
          )}

          {/* SubView 5: Account & Subscriptions Management */}
          {activeSubView === 'account' && (
            <div className="animate-fade-in">
              <AccountView
                onNotify={showToast}
              />
            </div>
          )}
        </main>
      )}

      {/* World-Class Glassmorphic Designer Floating Toast */}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-3 right-3 mx-auto max-w-sm px-3.5 py-2.5 rounded-xl text-xs shadow-2xl font-medium animate-fade-in z-50 flex items-center gap-2.5 border backdrop-blur-xl transition-all ${
            activeToast.isError
              ? 'bg-slate-950/95 text-rose-200 border-rose-500/40 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_18px_rgba(244,63,94,0.2)]'
              : 'bg-slate-950/95 text-slate-100 border-emerald-500/40 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_18px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div
            className={`p-1 rounded-full shrink-0 ${
              activeToast.isError
                ? 'bg-rose-500/15 text-rose-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {activeToast.isError ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="flex-1 text-[11.5px] leading-snug font-medium text-slate-200 break-words">
            {activeToast.message}
          </span>
          <button
            onClick={() => setActiveToast(null)}
            className="p-1 -mr-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-2 mt-auto border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>CodeMate AI • Practice Companion</span>
        <span>{backendOnline ? '🟢 Backend Ready' : '🔴 Backend Offline'}</span>
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
