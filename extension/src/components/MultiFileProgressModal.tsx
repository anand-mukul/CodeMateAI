import React from 'react';
import { CheckCircle2, Loader2, Clock, AlertTriangle, X, ShieldAlert, Layers } from 'lucide-react';

export interface MultiFileStepState {
  step: number;
  total: number;
  currentFile: string;
  phase: 'synthesizing' | 'injecting' | 'settling' | 'completed' | 'failed';
  message: string;
  files: string[];
  completedFiles: string[];
}

interface MultiFileProgressModalProps {
  isOpen: boolean;
  state: MultiFileStepState;
  onCancel: () => void;
}

export const MultiFileProgressModal: React.FC<MultiFileProgressModalProps> = ({
  isOpen,
  state,
  onCancel,
}) => {
  if (!isOpen) return null;

  const percent = state.total > 0 ? Math.round((state.step / state.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl p-4 flex flex-col gap-3.5 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                Multi-File Orchestrator
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  LangGraph.js
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Coordinated Sequential Synthesis & Injection
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cancel & Purge Ephemeral Memory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Counter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              Progress ({state.step}/{state.total} files)
            </span>
            <span className="text-indigo-400 font-bold font-mono">{percent}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-[11px]">
          {state.phase === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : state.phase === 'failed' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-slate-200 truncate font-medium">{state.message}</p>
            <p className="text-[10px] text-slate-500">
              Ephemeral Redis context TTL: 15m auto-expire
            </p>
          </div>
        </div>

        {/* File Dependency DAG Checklist */}
        {state.files.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Dependency Execution Plan
            </span>

            {state.files.map((file, idx) => {
              const isDone = state.completedFiles.includes(file);
              const isCurrent = state.currentFile === file && state.phase !== 'completed';

              return (
                <div
                  key={file}
                  className={`flex items-center justify-between p-2 rounded-xl border text-[11px] transition-all ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : isCurrent
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-white font-medium shadow-sm'
                      : 'bg-slate-950/30 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate font-mono">{file}</span>
                  </div>

                  <span className="text-[10px] font-mono shrink-0 ml-2">
                    {isDone ? '✓ Injected' : isCurrent ? `⚡ ${state.phase}` : `Step ${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / Cancel Button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero contract drift</span>
          </div>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/50 hover:text-red-300 text-slate-300 text-xs font-semibold border border-slate-700/60 hover:border-red-500/40 transition-all cursor-pointer"
          >
            Cancel & Discard Memory
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiFileProgressModal;
