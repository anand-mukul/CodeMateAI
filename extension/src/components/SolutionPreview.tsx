import React, { useState } from 'react';
import { Copy, Check, Code2, AlertTriangle, Clock, HardDrive, RefreshCw, Zap, Lock, Square } from 'lucide-react';
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
  const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPPORT_AGENT'].includes(userRole);
  const hasOneClick = isPrivileged || (subscription?.entitlements?.includes('one_click_insert') ?? false);

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
      setCopyFeedback('Direct 1-click editor replacement requires the AutoPilot Pass (₹61/week). Use "Copy Code" to paste manually.');
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
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm animate-fade-in">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">{targetFile || `${language} Solution`}</span>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
            {language}
          </span>
        </div>

        {code && !isLoading && !error && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              title="Copy code to clipboard (Ctrl+C)"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-200">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            {hasOneClick ? (
              <button
                onClick={handleReplaceInEditor}
                disabled={inserting}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Replace code in CodeChef Ace editor (Preserves Undo with Ctrl+Z)"
              >
                {insertSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Replaced in {targetFile || 'Editor'}!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>Replace in {targetFile || 'Editor'}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleReplaceInEditor}
                className="flex items-center gap-1 text-[10px] font-medium text-amber-300 hover:text-amber-200 px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
                title="1-Click direct insertion is included with AutoPilot Pass (₹61/week). Click to learn more."
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>1-Click Pass (₹61/wk)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Algorithm & Complexity Badges */}
      {(algorithm || complexity) && !isLoading && !error && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
          {algorithm && (
            <div className="text-[11px] font-medium text-slate-300 bg-slate-850 px-2 py-0.5 rounded border border-slate-750">
              <span className="text-slate-400">Algorithm: </span>
              <span className="text-indigo-300 font-semibold">{algorithm}</span>
            </div>
          )}
          {complexity?.time && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Clock className="w-3 h-3" />
              <span>Time: {complexity.time.notation}</span>
            </div>
          )}
          {complexity?.space && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              <HardDrive className="w-3 h-3" />
              <span>Space: {complexity.space.notation}</span>
            </div>
          )}
        </div>
      )}

      {/* Code / State Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-7 rounded-xl bg-slate-950/80 border border-slate-800/80 gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-xs text-slate-300 font-medium animate-pulse">
            Generating optimal {language} solution with fast I/O...
          </span>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-1 text-[11px] font-semibold px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Square className="w-3 h-3 fill-current text-rose-400" />
              <span>Stop Generation</span>
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
          {/* Code Container with Wrap Toggle */}
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>{code.split('\n').length} lines • {code.length} characters</span>
            <button
              onClick={() => setWrapLines(!wrapLines)}
              className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {wrapLines ? 'Disable Line Wrap' : 'Enable Line Wrap'}
            </button>
          </div>

          <div className={`relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] leading-relaxed text-slate-200 max-h-64 overflow-y-auto overflow-x-auto selection:bg-indigo-600 selection:text-white ${
            wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
          }`}>
            <code>{code}</code>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Full Undo (Ctrl+Z) preserved in CodeChef
            </span>
            {hasOneClick ? (
              <button
                onClick={handleReplaceInEditor}
                disabled={inserting}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 hover:underline"
              >
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{insertSuccess ? `✓ Applied to ${targetFile || 'Editor'}` : `Click to Replace in ${targetFile || 'Editor'}`}</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span>Free Tier • Manual paste enabled (Ctrl+V)</span>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
          <p>{emptyMessage}</p>
        </div>
      )}

      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
          {copyFeedback}
        </div>
      )}

      {/* Edge Cases & Warnings */}
      {edgeCases && edgeCases.length > 0 && !isLoading && !error && (
        <div className="pt-2 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400 font-medium">Covered Edge Cases:</span>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
            {edgeCases.map((ec, idx) => (
              <li key={idx} className="line-clamp-2">{ec}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings && warnings.length > 0 && !isLoading && !error && (
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
          <span className="font-semibold">Caveat: </span>
          {warnings.join(' • ')}
        </div>
      )}
    </div>
  );
};

export default SolutionPreview;
