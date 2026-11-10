import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileCode2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Lock,
  Square,
  WrapText,
  Clock,
  Layers,
} from 'lucide-react';
import { ClipboardManager } from '../clipboard/clipboard-manager';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { ComplexityAnalysisDTO } from '../types/ai';
import { inferTargetFilename } from '../utils/language';
import { useAuth } from '../context/AuthContext';

interface SolutionPreviewProps {
  code?: string;
  language: string;
  algorithm?: string;
  complexity?: ComplexityAnalysisDTO;
  edgeCases?: string[];
  warnings?: string[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onStop?: () => void;
}

export const SolutionPreview: React.FC<SolutionPreviewProps> = ({
  code,
  language,
  algorithm,
  complexity,
  edgeCases,
  warnings,
  isLoading = false,
  error = null,
  emptyMessage = 'Click "Generate Solution" to generate optimal, competitive code with AI.',
  onRetry,
  onStop,
}) => {
  const { user, subscription } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isPrivileged = userRole === 'ADMIN';
  const planId = (subscription?.plan_id || '').toUpperCase();
  const hasOneClick =
    isPrivileged ||
    planId === 'PLAN_CORE_PASS' ||
    planId === 'PLAN_AUTOPILOT_PASS' ||
    (subscription?.entitlements?.includes('one_click_insert') ?? false);

  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [inserting, setInserting] = useState(false);
  const [insertSuccess, setInsertSuccess] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    const res = await ClipboardManager.copyCode(code);
    if (res.success) {
      setCopied(true);
      setCopyFeedback('Copied to clipboard! Ready to paste (Ctrl+V).');
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 2500);
    } else {
      setCopyFeedback(`Copy failed: ${res.error || 'Permission error'}`);
      setTimeout(() => setCopyFeedback(null), 3500);
    }
  };

  const targetFile = inferTargetFilename(code || '', language);

  const handleReplaceInEditor = async () => {
    if (!code) return;
    if (!hasOneClick) {
      setCopyFeedback(
        'Direct 1-click editor replacement is included with Core Pass (₹21/day) or AutoPilot Pass (₹61/week). Use "Copy Code" to paste manually.'
      );
      setTimeout(() => setCopyFeedback(null), 4000);
      return;
    }

    setInserting(true);
    try {
      if (targetFile) {
        await ExtensionMessagingService.switchTab(targetFile);
        await new Promise((r) => setTimeout(r, 150));
      }
      const res = await ExtensionMessagingService.insertCode({
        code,
        mode: 'replace',
        targetFile: targetFile || undefined,
      });
      if (res && res.success) {
        setInsertSuccess(true);
        setTimeout(() => setInsertSuccess(false), 3000);
      } else {
        await handleCopy();
      }
    } catch {
      await handleCopy();
    } finally {
      setInserting(false);
    }
  };

  if (!code && !isLoading && !error) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-sm animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        {/* File and language metadata */}
        <div className="flex items-center gap-1.5 min-w-0">
          <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span
            className="text-xs font-semibold text-slate-100 truncate"
            title={targetFile || `${language} Solution`}
          >
            {targetFile || `${language} Solution`}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
            {language}
          </span>
        </div>

        {/* Top actions: Line wrap & Copy */}
        {code && !isLoading && !error && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setWrapLines(!wrapLines)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                wrapLines
                  ? 'bg-slate-800 text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-750'
              }`}
              title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
            >
              <WrapText className="w-3 h-3" />
              <span>{wrapLines ? 'Wrap on' : 'Wrap'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors cursor-pointer"
              title="Copy code to clipboard (Ctrl+C)"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Algorithm & Complexity Metadata (Clean badges, zero dangling dots) */}
      {(algorithm || complexity) && !isLoading && !error && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/80">
          {algorithm && (
            <div className="text-[11px] text-slate-300 flex items-baseline gap-1.5">
              <span className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">
                Algorithm:
              </span>
              <span className="font-semibold text-slate-200">{algorithm}</span>
            </div>
          )}
          {(complexity?.time || complexity?.space) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {complexity?.time && (
                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Time: {complexity.time.notation}</span>
                </span>
              )}
              {complexity?.space && (
                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Space: {complexity.space.notation}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Code / State Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-7 rounded-xl bg-slate-950 border border-slate-800 gap-3">
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-xs text-slate-300 font-medium">
            Writing optimal {language} solution...
          </span>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-1 text-xs font-medium px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current text-rose-400" />
              <span>Stop</span>
            </button>
          )}
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 shadow-md text-rose-200 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <div className="p-1 rounded-full bg-rose-500/15 text-rose-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span>Generation Notice</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="self-start text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Retry Generation
            </button>
          )}
        </div>
      ) : code ? (
        <div className="flex flex-col gap-2">
          {/* Code viewport with sleek scrollbars */}
          <div className="relative rounded-lg bg-slate-950 border border-slate-800/90 overflow-hidden">
            <div
              className={`p-3 font-mono text-[11px] leading-relaxed text-slate-200 max-h-64 overflow-y-auto overflow-x-auto selection:bg-indigo-600 selection:text-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent ${
                wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
              }`}
            >
              <code>{code}</code>
            </div>
          </div>

          {/* Primary Action Button: 1-Click Replace in Editor */}
          {hasOneClick ? (
            <button
              onClick={handleReplaceInEditor}
              disabled={inserting}
              className={`w-full py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                insertSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-emerald-950/40'
              }`}
              title={`Replace code in ${targetFile || 'Editor'} (Preserves Ctrl+Z undo)`}
            >
              {inserting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Injecting into {targetFile || 'Editor'}...</span>
                </>
              ) : insertSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Successfully Replaced in {targetFile || 'Editor'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-200 fill-emerald-200" />
                  <span>Replace in {targetFile || 'Editor'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleReplaceInEditor}
              className="w-full py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
              title="1-Click direct insertion is included with Core Pass or AutoPilot Pass. Click to learn more."
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Editor Insert (Core / AutoPilot Pass)</span>
            </button>
          )}

          {/* Footer Info Row */}
          <div className="flex items-center justify-between px-0.5 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Undo (Ctrl+Z) preserved in editor</span>
            </span>
            <span className="text-slate-500 font-mono">
              {code.split('\n').length} lines • {code.length.toLocaleString()} chars
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
          <p>{emptyMessage}</p>
        </div>
      )}

      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-md">
          {copyFeedback}
        </div>
      )}

      {/* Edge Cases & Warnings */}
      {edgeCases && edgeCases.length > 0 && !isLoading && !error && (
        <div className="pt-2 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400 font-medium">Covered Edge Cases:</span>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
            {edgeCases.map((ec, idx) => (
              <li key={idx} className="line-clamp-2">
                {ec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings && warnings.length > 0 && !isLoading && !error && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
          <span className="font-semibold">Caveat: </span>
          {warnings.join(' • ')}
        </div>
      )}
    </div>
  );
};

export default SolutionPreview;
