import React from 'react';
import { Sparkles, RefreshCw, Settings, User, Palette, PanelRightOpen } from 'lucide-react';

interface HeaderProps {
  isConnected?: boolean;
  isSupported?: boolean;
  backendOnline?: boolean;
  activeProvider?: string;
  onRefresh: () => void;
  onOpenSettings?: () => void;
  onOpenTheme?: () => void;
  onOpenAccount?: () => void;
  userEmail?: string;
  planName?: string;
  isLoading: boolean;
  isSidePanel?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected: _isConnected,
  isSupported: _isSupported,
  backendOnline = false,
  activeProvider = 'gemini',
  onRefresh,
  onOpenSettings,
  onOpenTheme,
  onOpenAccount,
  userEmail,
  planName = 'Free',
  isLoading,
  isSidePanel = false,
}) => {
  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.sidePanel.open({ tabId: tab.id });
          window.close();
        }
      });
    }
  };

  return (
    <header className="flex flex-col gap-2 pb-2 mb-0.5 border-b border-slate-800/80">
      {/* Row 1: Brand Logo & Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">CodeMate AI</h1>
            <span
              onClick={onOpenAccount}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 cursor-pointer transition-colors uppercase tracking-wider"
              title="Click to view subscription plan"
            >
              {planName}
            </span>
          </div>
        </div>

        {/* Action Icons: SidePanel, Theme, Refresh, Settings */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isSidePanel && typeof chrome !== 'undefined' && chrome.sidePanel && (
            <button
              onClick={handleOpenSidePanel}
              className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Open Companion in Chrome SidePanel (Docked)"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenTheme}
            className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Change Theme & Appearance"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh connection & page status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="AI Provider Settings & Keys"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: User Status & AI Engine Pill */}
      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
        {/* User Account Pill */}
        <button
          onClick={onOpenAccount}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 transition-all cursor-pointer truncate max-w-[170px]"
          title={userEmail ? `Signed in as ${userEmail}` : 'Sign In to CodeMate AI'}
        >
          <User className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate">{userEmail ? userEmail.split('@')[0] : 'Sign In'}</span>
        </button>

        {/* AI Engine Status Pill */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-all cursor-pointer shrink-0 ${
            backendOnline
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
          }`}
          title="Click to configure AI providers and models"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {backendOnline ? (activeProvider === 'openai' ? 'OpenAI' : activeProvider === 'mock' ? 'Mock AI' : 'Gemini') : 'Offline'}
          </span>
        </button>
      </div>
    </header>
  );
};
