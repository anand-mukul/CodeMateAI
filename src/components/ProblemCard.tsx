import React from 'react';
import { BookOpen, RefreshCw, FileCheck, AlertCircle } from 'lucide-react';
import { ProblemContext } from '../types/problem';

interface ProblemCardProps {
  problem: ProblemContext | null;
  isSupported: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  isSupported,
  onRefresh,
  isLoading,
}) => {
  if (!problem || !isSupported) {
    return (
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-300">Problem Context</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Awaiting Page
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Navigate to any CodeChef practice problem (e.g. <span className="text-indigo-400">/problems/START01</span>) to automatically detect problem statement, constraints, and coding editor.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Problem</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {problem.platform}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
            title="Refresh problem info"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white tracking-tight line-clamp-2">
          {problem.problemTitle || problem.problemCode || 'Practice Problem'}
        </h2>
        <div className="flex items-center gap-2 mt-1.5">
          {problem.problemCode && (
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750">
              {problem.problemCode}
            </span>
          )}
          {problem.extractionSuccess ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
              <FileCheck className="w-3 h-3" />
              <span>Statement Ready</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              <span>Manual Entry</span>
            </span>
          )}
          {problem.editorAttached && (
            <span className="text-[10px] text-slate-400 font-medium">
              • {problem.editorFramework || 'Editor Attached'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
