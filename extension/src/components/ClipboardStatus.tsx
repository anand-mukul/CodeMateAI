import React, { useState, useEffect } from 'react';
import { Clipboard, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { ClipboardManager } from '../clipboard/clipboard-manager';
import { ClipboardStatus as IClipboardStatus } from '../types/clipboard';

export const ClipboardStatus: React.FC = () => {
  const [status, setStatus] = useState<IClipboardStatus | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Only check permission state, DO NOT read clipboard automatically
    ClipboardManager.getPermissionStatus().then(setStatus);
  }, []);

  const handleTestRead = async () => {
    setTesting(true);
    const res = await ClipboardManager.testRead();
    setStatus(res);
    setTesting(false);
  };

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
          <span>Clipboard Readiness</span>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            status?.permission === 'granted'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          Permission: {status?.permission || 'Checking...'}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-normal">
        Clipboard read access requires explicit user activation per Chromium security standards.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTestRead}
          disabled={testing}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Reading...' : 'Test Clipboard Read Access'}</span>
        </button>
      </div>

      {status?.lastReadLength !== undefined && (
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-1 text-emerald-400 mb-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Clipboard Read Verified ({status.lastReadLength} chars)</span>
          </div>
          {status.lastReadSnippet && (
            <p className="text-slate-400 truncate">"{status.lastReadSnippet}"</p>
          )}
        </div>
      )}

      {status?.error && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] flex items-start gap-1">
          <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{status.error}</span>
        </div>
      )}
    </div>
  );
};

