import React, { useState } from 'react';
import { Zap, Copy, Check, ArrowRight, RefreshCw, AlertTriangle, FileCode, Square } from 'lucide-react';
import { ClipboardManager } from '../clipboard/clipboard-manager';
import { OptimizationResponseDTO } from '../types/ai';

interface AIOptimizeSolutionProps {
  optimizationResult: OptimizationResponseDTO | null;
  currentCode: string;
  onCodeChange: (code: string) => void;
  onFetchFromEditor: () => Promise<void>;
  onOptimize: () => void;
  onStop?: () => void;
  isLoading: boolean;
  error: string | null;
  language: string;
}

export const AIOptimizeSolution: React.FC<AIOptimizeSolutionProps> = ({
  optimizationResult,
  currentCode,
  onCodeChange,
  onFetchFromEditor,
  onOptimize,
  onStop,
  isLoading,
  error,
  language,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'comparison' | 'optimized'>('comparison');

  const handleCopyOptimized = async () => {
    if (!optimizationResult?.improved_code) return;
    const res = await ClipboardManager.copyCode(optimizationResult.improved_code);
    if (res.success) {
      setCopied(true);
      setCopyFeedback('Optimized code copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 2500);
    } else {
      setCopyFeedback(`Copy failed: ${res.error}`);
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 shadow-xs text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-semibold text-slate-100">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Code Optimizer</span>
        </div>
        <button
          onClick={onFetchFromEditor}
          className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
          title="Extract current code from CodeChef editor"
        >
          <FileCode className="w-3 h-3 text-indigo-400" />
          <span>Fetch from editor</span>
        </button>
      </div>

      {/* Input Code Area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Code to optimize ({language}):</span>
          <span className="text-[10px] font-mono">{currentCode.length} chars</span>
        </div>
        <textarea
          value={currentCode}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder={`// Paste your ${language} code here, or click "Fetch from editor" above...`}
          className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-indigo-500 resize-y"
        />

        {isLoading ? (
          <div className="flex items-center gap-2 w-full">
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-white bg-slate-800 border border-slate-700 cursor-wait"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span>Optimizing code...</span>
            </button>
            {onStop && (
              <button
                onClick={onStop}
                className="py-2 px-3 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Stop optimization"
              >
                <Square className="w-3 h-3 fill-current text-rose-400" />
                <span>Stop</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOptimize}
            disabled={!currentCode.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Optimize code</span>
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-2 text-[11px]">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Optimization Result Display */}
      {optimizationResult && !isLoading && (
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
          {/* Complexity Delta Bar */}
          <div className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">Time:</span>
              <span className="text-amber-400 line-through">
                {optimizationResult.original_complexity.time.notation}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-emerald-400 font-bold">
                {optimizationResult.optimized_complexity.time.notation}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">Space:</span>
              <span className="text-amber-400">
                {optimizationResult.original_complexity.space.notation}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-cyan-400 font-bold">
                {optimizationResult.optimized_complexity.space.notation}
              </span>
            </div>
          </div>

          {/* Explanation of Changes */}
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200 leading-relaxed">
            <span className="font-semibold text-white">Summary of changes: </span>
            {optimizationResult.explanation_of_changes}
          </div>

          {/* Bottlenecks Eliminated */}
          {optimizationResult.bottlenecks_eliminated && optimizationResult.bottlenecks_eliminated.length > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200">
              <span className="font-semibold text-emerald-300">Improvements:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {optimizationResult.bottlenecks_eliminated.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tradeoffs */}
          {optimizationResult.tradeoffs && optimizationResult.tradeoffs.length > 0 && (
            <div className="p-2 rounded bg-slate-950/40 border border-slate-800 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-300">Trade-offs: </span>
              {optimizationResult.tradeoffs.join(' • ')}
            </div>
          )}

          {/* View Toggle & Copy Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[10px]">
              <button
                onClick={() => setActiveView('comparison')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeView === 'comparison'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setActiveView('optimized')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeView === 'optimized'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Optimized Only
              </button>
            </div>

            <button
              onClick={handleCopyOptimized}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-indigo-400" />
                  <span>Copy Optimized Code</span>
                </>
              )}
            </button>
          </div>

          {copyFeedback && (
            <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
              {copyFeedback}
            </div>
          )}

          {/* Code Viewer */}
          {activeView === 'comparison' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-sans text-[11px]">Original:</span>
                <div className="p-2.5 rounded-lg bg-[#070b14] border border-slate-800 max-h-48 overflow-y-auto whitespace-pre text-slate-400">
                  {currentCode}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-emerald-400 font-sans text-[11px]">Optimized:</span>
                <div className="p-2.5 rounded-lg bg-[#070b14] border border-emerald-500/30 max-h-48 overflow-y-auto whitespace-pre text-emerald-300">
                  {optimizationResult.improved_code}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#070b14] border border-slate-800 font-mono text-[11px] text-slate-200 max-h-60 overflow-y-auto whitespace-pre">
              {optimizationResult.improved_code}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIOptimizeSolution;
