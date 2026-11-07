import React, { useState, useEffect } from 'react';
import {
  Clipboard,
  Download,
  Upload,
  Trash2,
  Undo2,
  Redo2,
  ArrowRight,
  CornerDownLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ClipboardManager } from '../clipboard/clipboard-manager';
import { ClipboardStatus } from '../types/clipboard';
import { InsertionMode } from '../types/editor';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { ConfirmationModal } from './ConfirmationModal';
import { CodeMateError } from '../clipboard/clipboard-errors';

interface SmartClipboardProps {
  onInsertionSuccess?: () => void;
  onNotify?: (message: string, isError?: boolean) => void;
}

export const SmartClipboard: React.FC<SmartClipboardProps> = ({
  onInsertionSuccess,
  onNotify,
}) => {
  const { subscription } = useAuth();
  const hasOneClick = subscription?.entitlements?.includes('one_click_insert') ?? false;

  const [status, setStatus] = useState<ClipboardStatus | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<string>('Text');
  const [charCount, setCharCount] = useState<number>(0);
  const [lineCount, setLineCount] = useState<number>(0);
  const [insertionMode, setInsertionMode] = useState<InsertionMode>('cursor');

  const [isReading, setIsReading] = useState(false);
  const [isCopyingEditor, setIsCopyingEditor] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Check initial permission status (without reading clipboard!)
  useEffect(() => {
    ClipboardManager.checkAvailability().then(setStatus).catch(() => {});
  }, []);

  const notify = (msg: string, isError = false) => {
    setFeedback({ text: msg, isError });
    if (onNotify) onNotify(msg, isError);
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === msg ? null : prev));
    }, 4000);
  };

  /**
   * User-activated read from clipboard
   */
  const handleReadClipboard = async () => {
    setIsReading(true);
    setFeedback(null);

    try {
      const result = await ClipboardManager.readText();
      setPreviewText(result.text);
      setDetectedLang(result.detectedLanguage);
      setCharCount(result.charCount);
      setLineCount(result.lineCount);

      setStatus({
        permission: 'granted',
        readSupported: true,
        writeSupported: true,
        lastReadLength: result.charCount,
      });

      notify(`✓ Clipboard read successfully (${result.lineCount} lines, ${result.charCount} chars).`);
    } catch (err) {
      const code = err instanceof CodeMateError ? err.code : 'UNKNOWN_ERROR';
      const msg = err instanceof CodeMateError ? err.userMessage : String(err);

      setStatus((prev) => ({
        permission: code === 'CLIPBOARD_PERMISSION_DENIED' ? 'denied' : prev?.permission || 'prompt',
        readSupported: false,
        writeSupported: true,
        error: msg,
        errorCode: code,
      }));

      notify(msg, true);
    } finally {
      setIsReading(false);
    }
  };

  /**
   * Reads current code from CodeChef editor and copies to clipboard
   */
  const handleCopyEditorCode = async () => {
    setIsCopyingEditor(true);
    setFeedback(null);

    try {
      const res = await ExtensionMessagingService.getEditorCode();
      if (!res.success || !res.data) {
        throw new Error(res.error || "Could not read code from CodeChef editor.");
      }

      const editorCode = res.data.code;
      if (!editorCode || editorCode.trim().length === 0) {
        notify('CodeChef editor is currently empty.', true);
        return;
      }

      await ClipboardManager.writeText(editorCode);
      setPreviewText(editorCode);
      setCharCount(res.data.charCount);
      setLineCount(res.data.lineCount);

      notify(`✓ Copied ${res.data.lineCount} lines from CodeChef editor to clipboard.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), true);
    } finally {
      setIsCopyingEditor(false);
    }
  };

  /**
   * Clear current preview
   */
  const handleClearPreview = () => {
    setPreviewText('');
    setCharCount(0);
    setLineCount(0);
    setFeedback(null);
  };

  /**
   * Trigger insertion (checks mode first)
   */
  const handlePasteIntoEditor = async () => {
    if (!previewText.trim()) {
      notify('Clipboard preview is empty. Please read clipboard or copy code first.', true);
      return;
    }

    if (!hasOneClick) {
      notify('Direct editor insertion is exclusive to the AutoPilot Pass (₹40/day). Please copy code and paste manually into CodeChef (Ctrl+V).', true);
      return;
    }

    if (insertionMode === 'replace') {
      setIsModalOpen(true);
      return;
    }

    await executeInsertion();
  };

  /**
   * Executes programmatic insertion via Ace Editor adapter
   */
  const executeInsertion = async () => {
    setIsInserting(true);
    setFeedback(null);

    try {
      const res = await ExtensionMessagingService.insertCode({
        code: previewText,
        mode: insertionMode,
      });

      if (res.success && res.data && res.data.success) {
        notify(
          `✓ Inserted ${res.data.lines || lineCount} lines into CodeChef Ace Editor. Press Ctrl+Z to undo.`
        );
        if (onInsertionSuccess) onInsertionSuccess();
      } else {
        const errorMsg =
          res.data?.error || res.error || 'Failed to update editor document. Please check editor status.';
        notify(`Insertion failed: ${errorMsg}`, true);
      }
    } catch (err) {
      notify(`Insertion error: ${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
      setIsInserting(false);
      setIsModalOpen(false);
    }
  };

  /**
   * Quick Undo handler
   */
  const handleUndo = async () => {
    const res = await ExtensionMessagingService.undoEditor();
    if (res.success && res.data?.success) {
      notify('✓ Undo applied to CodeChef editor.');
      if (onInsertionSuccess) onInsertionSuccess();
    } else {
      notify('Nothing to undo in editor.', true);
    }
  };

  /**
   * Quick Redo handler
   */
  const handleRedo = async () => {
    const res = await ExtensionMessagingService.redoEditor();
    if (res.success && res.data?.success) {
      notify('✓ Redo applied to CodeChef editor.');
      if (onInsertionSuccess) onInsertionSuccess();
    } else {
      notify('Nothing to redo in editor.', true);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Clipboard className="w-4 h-4 text-indigo-400" />
          <span>Smart Clipboard Engine</span>
        </div>

        {/* Readiness Badge */}
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            status?.permission === 'granted'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : status?.permission === 'denied'
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {status?.permission === 'granted'
            ? 'Ready'
            : status?.permission === 'denied'
            ? 'Permission Denied'
            : 'Click to Read'}
        </span>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleReadClipboard}
          disabled={isReading}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-medium text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <Download className={`w-3.5 h-3.5 text-indigo-400 ${isReading ? 'animate-bounce' : ''}`} />
          <span>{isReading ? 'Reading...' : 'Read Clipboard'}</span>
        </button>

        <button
          onClick={handleCopyEditorCode}
          disabled={isCopyingEditor}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg font-medium text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
        >
          <Upload className={`w-3.5 h-3.5 text-purple-400 ${isCopyingEditor ? 'animate-pulse' : ''}`} />
          <span>{isCopyingEditor ? 'Copying...' : 'Copy Editor Code'}</span>
        </button>
      </div>

      {/* Clipboard Code Preview Box */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Clipboard Preview</span>
            {previewText && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {detectedLang}
              </span>
            )}
          </div>
          {previewText && (
            <button
              onClick={handleClearPreview}
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300 min-h-[90px] max-h-40 overflow-y-auto overflow-x-auto whitespace-pre selection:bg-indigo-600 selection:text-white">
          {previewText ? (
            <code>{previewText}</code>
          ) : (
            <span className="text-slate-600 italic select-none">
              Click &quot;Read Clipboard&quot; or &quot;Copy Editor Code&quot; to inspect code snippet...
            </span>
          )}
        </div>

        {previewText && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
            <span>Lines: {lineCount}</span>
            <span>Characters: {charCount}</span>
          </div>
        )}
      </div>

      {/* Insertion Mode Selector */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
        <span className="text-slate-400">Insertion Mode:</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="radio"
              name="smart-insert-mode"
              checked={insertionMode === 'cursor'}
              onChange={() => setInsertionMode('cursor')}
              className="text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span>At Cursor</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="radio"
              name="smart-insert-mode"
              checked={insertionMode === 'replace'}
              onChange={() => setInsertionMode('replace')}
              className="text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span>Replace All</span>
          </label>
        </div>
      </div>

      {/* Main Paste / Insert Action Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePasteIntoEditor}
          disabled={isInserting || !previewText.trim()}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none ${
            !hasOneClick
              ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200 hover:bg-amber-900/40 shadow-amber-500/10'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] shadow-indigo-500/20'
          }`}
        >
          {isInserting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : !hasOneClick ? (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          ) : insertionMode === 'replace' ? (
            <CornerDownLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>
            {!hasOneClick
              ? '1-Click Insert Locked (AutoPilot Pass)'
              : insertionMode === 'replace'
              ? 'Replace All in CodeChef Editor'
              : 'Paste into CodeChef Editor'}
          </span>
        </button>

        {/* Undo / Redo Toolbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            title="Undo last editor edit (Ctrl+Z)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            title="Redo editor edit (Ctrl+Y)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-Time Feedback Alert */}
      {feedback && (
        <div
          className={`p-2 rounded-lg text-[11px] leading-tight flex items-start gap-1.5 animate-fade-in ${
            feedback.isError
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Confirmation Modal for Replace Mode */}
      <ConfirmationModal
        isOpen={isModalOpen}
        title="Confirm Code Replacement"
        message="This action will completely overwrite the active document in the CodeChef Ace Editor. Are you sure you want to replace all code?"
        confirmLabel="Replace Entire Code"
        cancelLabel="Cancel"
        onConfirm={executeInsertion}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
};
