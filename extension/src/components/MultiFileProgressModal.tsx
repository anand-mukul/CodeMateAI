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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-lg bg-slate-900 border border-slate-800 shadow-xl p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-300">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Updating project files
              </h3>
              <p className="text-[10px] text-slate-400">
                Sequentially applying updates
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cancel"
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

          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden border border-slate-750">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2 text-[11px]">
          {state.phase === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : state.phase === 'failed' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-slate-200 truncate font-medium">{state.message}</p>
          </div>
        </div>

        {/* Files Checklist */}
        {state.files.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            <span className="text-[11px] font-medium text-slate-400">
              Files to update
            </span>

            {state.files.map((file, idx) => {
              const isDone = state.completedFiles.includes(file);
              const isCurrent = state.currentFile === file && state.phase !== 'completed';

              return (
                <div
                  key={file}
                  className={`flex items-center justify-between p-2 rounded-lg border text-[11px] transition-colors ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : isCurrent
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-white font-medium shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
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
                    {isDone ? 'Updated' : isCurrent ? 'Writing...' : `File ${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / Cancel Button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Preserves existing signatures</span>
          </div>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiFileProgressModal;
