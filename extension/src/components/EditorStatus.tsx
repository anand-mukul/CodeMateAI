import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Cpu, Layers } from 'lucide-react';
import { EditorStatus as IEditorStatus } from '../types/editor';

interface EditorStatusProps {
  status: IEditorStatus | null;
  platform: string;
  isPractice: boolean;
  isLoading: boolean;
}

export const EditorStatus: React.FC<EditorStatusProps> = ({
  status,
  platform,
  isPractice,
  isLoading,
}) => {
  const isDetected = status?.detected || false;
  const isAdapterReady = status?.adapterReady || false;
  const isInsertionSupported = status?.insertionSupported || false;
  const framework = status?.framework || 'UNKNOWN';
  const version = status?.version ? `v${status.version}` : '';

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Editor Compatibility Inspector</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">Live Runtime</span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        {/* Platform */}
        <div>
          <span className="text-[11px] text-slate-500 block">Platform</span>
          <span className="font-medium text-slate-200">{platform}</span>
        </div>

        {/* Page Context */}
        <div>
          <span className="text-[11px] text-slate-500 block">Page Type</span>
          <span className="font-medium text-slate-200">
            {isPractice ? 'Practice Problem' : 'Contest / Other'}
          </span>
        </div>

        {/* Editor Detection */}
        <div>
          <span className="text-[11px] text-slate-500 block">Editor Status</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isLoading ? (
              <span className="text-slate-400 text-xs">Inspecting...</span>
            ) : isDetected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-emerald-400">Detected</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-amber-400">Not Mounted</span>
              </>
            )}
          </div>
        </div>

        {/* Framework */}
        <div>
          <span className="text-[11px] text-slate-500 block">Framework</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">
              {framework === 'ACE' ? `Ace Editor ${version}` : framework}
            </span>
          </div>
        </div>

        {/* Adapter */}
        <div>
          <span className="text-[11px] text-slate-500 block">Adapter</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isAdapterReady ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-emerald-400">Initialized</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium text-slate-500">Standby</span>
              </>
            )}
          </div>
        </div>

        {/* Insertion Support */}
        <div>
          <span className="text-[11px] text-slate-500 block">Insertion</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isInsertionSupported ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-emerald-400">Supported</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-medium text-red-400">Unsupported</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Realtime Document Stats if available */}
      {status && isDetected && (
        <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Mode: <strong className="text-indigo-300 font-medium">{status.mode || 'plain'}</strong></span>
          <span>Lines: <strong className="text-slate-200">{status.lineCount}</strong></span>
          <span>Chars: <strong className="text-slate-200">{status.characterCount}</strong></span>
        </div>
      )}

      {status?.error && (
        <div className="mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{status.error}</span>
        </div>
      )}
    </div>
  );
};
