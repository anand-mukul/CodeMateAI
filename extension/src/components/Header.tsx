import React from 'react';
import { Code2, RefreshCw, Settings, PanelRightOpen } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  onOpenSettings?: () => void;
  planName?: string;
  isLoading: boolean;
  isSidePanel?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onOpenSettings,
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

  const formattedPlan = planName.replace(/PLAN_|_PASS/g, '').toLowerCase();
  const displayPlan = formattedPlan.charAt(0).toUpperCase() + formattedPlan.slice(1);

  return (
    <header className="flex items-center justify-between pb-2.5 mb-0.5 border-b border-slate-800/80">
      {/* Brand & Plan */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/30">
          <Code2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-white tracking-tight">CodeMate</span>
          <span className="text-slate-600">•</span>
          <button
            onClick={onOpenSettings}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-850"
            title="Settings & subscription"
          >
            {displayPlan}
          </button>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!isSidePanel && typeof chrome !== 'undefined' && chrome.sidePanel && (
          <button
            onClick={handleOpenSidePanel}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Open side panel"
          >
            <PanelRightOpen className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh editor & status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
