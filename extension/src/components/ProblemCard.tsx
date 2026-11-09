import React from 'react';
import { RefreshCw, FileCode } from 'lucide-react';
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
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span className="font-medium text-slate-300">Problem</span>
          </div>
          <span className="text-[11px] text-slate-500">Waiting for editor</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Open a problem on CodeChef to automatically detect the statement and code editor.
        </p>
      </div>
    );
  }

  const platformName = problem.platform
    ? problem.platform.charAt(0).toUpperCase() + problem.platform.slice(1).toLowerCase()
    : 'CodeChef';

  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="p-1 rounded bg-slate-800 text-slate-400 shrink-0 mt-0.5">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="text-xs font-semibold text-white tracking-tight line-clamp-2 leading-snug">
            {problem.problemTitle || problem.problemCode || 'Practice Problem'}
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          title="Refresh problem"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pl-7">
        {problem.problemCode && <span className="font-mono text-slate-300">{problem.problemCode}</span>}
        {problem.problemCode && <span className="text-slate-600">•</span>}
        <span>{platformName}</span>
        <span className="text-slate-600">•</span>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${problem.extractionSuccess ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className={problem.extractionSuccess ? 'text-slate-300' : 'text-amber-400'}>
            {problem.extractionSuccess ? 'Statement ready' : 'Manual entry'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;
