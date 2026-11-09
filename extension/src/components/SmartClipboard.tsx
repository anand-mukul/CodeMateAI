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
} from 'lucide-react';
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

function detectCodeLanguage(code: string, fileName?: string): string {
  if (fileName) {
    const fn = fileName.toLowerCase();
    if (fn.endsWith('.java')) return 'Java';
    if (fn.endsWith('.py')) return 'Python';
    if (fn.endsWith('.cpp') || fn.endsWith('.cc') || fn.endsWith('.cxx')) return 'C++';
    if (fn.endsWith('.c')) return 'C';
    if (fn.endsWith('.js') || fn.endsWith('.jsx')) return 'JavaScript';
    if (fn.endsWith('.ts') || fn.endsWith('.tsx')) return 'TypeScript';
    if (fn.endsWith('.sql')) return 'SQL';
    if (fn.endsWith('.html') || fn.endsWith('.xml')) return 'XML/HTML';
  }
  const clean = code.trim();
  if (
    /package\s+[a-zA-Z0-9_\.]+;|import\s+java\.|import\s+org\.springframework\.|@Service|@RestController|@SpringBootApplication|@Component|@Autowired|@Test|public\s+class\s+|System\.out\.println|public\s+static\s+void\s+main/i.test(
      clean
    )
  )
    return 'Java';
  if (/#include\s+<|std::|int\s+main\s*\(|cout\s*<<|cin\s*>>|vector\s*</.test(clean)) return 'C++';
  if (/def\s+[a-zA-Z0-9_]+\s*\(|import\s+sys|print\s*\(|class\s+[a-zA-Z0-9_]+:/.test(clean)) return 'Python';
  if (/(interface|type)\s+[A-Z][a-zA-Z0-9_]*\s*=|export\s+default\s+function|:\s*React\.FC/.test(clean)) return 'TypeScript';
  if (/const\s+|let\s+|function\s*\(|console\.log|document\./.test(clean)) return 'JavaScript';
  return 'Text';
}

export const SmartClipboard: React.FC<SmartClipboardProps> = ({
  onInsertionSuccess,
  onNotify,
}) => {
  const [status, setStatus] = useState<ClipboardStatus | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [activeFileName, setActiveFileName] = useState<string>('');
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
      const lang = detectCodeLanguage(result.text);
      setDetectedLang(lang);
      setActiveFileName('');
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
      const activeTab = res.data.activeTab || '';
      if (!editorCode || editorCode.trim().length === 0) {
        notify('CodeChef editor is currently empty.', true);
        return;
      }

      await ClipboardManager.writeText(editorCode);
      setPreviewText(editorCode);
      setActiveFileName(activeTab);
      const lang = detectCodeLanguage(editorCode, activeTab);
      setDetectedLang(lang);
      setCharCount(res.data.charCount);
      setLineCount(res.data.lineCount);

      notify(
        activeTab
          ? `✓ Copied ${res.data.lineCount} lines from ${activeTab} to clipboard.`
          : `✓ Copied ${res.data.lineCount} lines from editor to clipboard.`
      );
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
    setActiveFileName('');
    setCharCount(0);
    setLineCount(0);
    setFeedback(null);
  };

  /**
   * Trigger insertion (checks mode first)
   * Free tier is allowed 1-Click Replace All & Paste from Smart Clipboard
   */
  const handlePasteIntoEditor = async () => {
    if (!previewText.trim()) {
      notify('Clipboard preview is empty. Please read clipboard or copy code first.', true);
      return;
    }

    if (insertionMode === 'replace') {
      setIsModalOpen(true);
      return;
    }

    await executeInsertion();
  };

  /**
   * Executes programmatic insertion via Ace/Monaco Editor adapter
   */
  const executeInsertion = async () => {
    setIsInserting(true);
    setFeedback(null);

    try {
      const res = await ExtensionMessagingService.insertCode({
        code: previewText,
        mode: insertionMode,
        targetFile: activeFileName || undefined,
      });

      if (res.success && res.data && res.data.success) {
        notify(
          activeFileName
            ? `✓ Inserted ${res.data.lines || lineCount} lines into ${activeFileName}. Press Ctrl+Z to undo.`
            : `✓ Inserted ${res.data.lines || lineCount} lines into CodeChef Editor. Press Ctrl+Z to undo.`
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
    <div className="flex flex-col gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 shadow-xs text-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Clipboard className="w-4 h-4 text-indigo-400" />
          <span>Clipboard</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status?.permission === 'granted'
                ? 'bg-emerald-400'
                : status?.permission === 'denied'
                ? 'bg-rose-400'
                : 'bg-slate-500'
            }`}
          />
          <span>
            {status?.permission === 'granted'
              ? 'Ready'
              : status?.permission === 'denied'
              ? 'Denied'
              : 'Standby'}
          </span>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleReadClipboard}
          disabled={isReading}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>{isReading ? 'Reading...' : 'Read clipboard'}</span>
        </button>

        <button
          onClick={handleCopyEditorCode}
          disabled={isCopyingEditor}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md font-medium text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>{isCopyingEditor ? 'Copying...' : 'Copy editor code'}</span>
        </button>
      </div>

      {/* Clipboard Code Preview Box */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>Preview</span>
            {activeFileName && (
              <span className="font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-medium">
                {activeFileName}
              </span>
            )}
            {previewText && (
              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {detectedLang}
              </span>
            )}
          </div>
          {previewText && (
            <button
              onClick={handleClearPreview}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
            <span className="text-slate-500 italic select-none">
              Click &quot;Read clipboard&quot; or &quot;Copy editor code&quot; to inspect code...
            </span>
          )}
        </div>

        {previewText && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
            <span>{lineCount} lines</span>
            <span>{charCount} characters</span>
          </div>
        )}
      </div>

      {/* Insertion Mode Selector */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
        <span className="text-slate-400">Mode:</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="radio"
              name="smart-insert-mode"
              checked={insertionMode === 'cursor'}
              onChange={() => setInsertionMode('cursor')}
              className="text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span>At cursor</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="radio"
              name="smart-insert-mode"
              checked={insertionMode === 'replace'}
              onChange={() => setInsertionMode('replace')}
              className="text-indigo-600 focus:ring-indigo-500 w-3 h-3 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <span>Replace all</span>
          </label>
        </div>
      </div>

      {/* Main Paste / Insert Action Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePasteIntoEditor}
          disabled={isInserting || !previewText.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:pointer-events-none bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
        >
          {isInserting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : insertionMode === 'replace' ? (
            <CornerDownLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>
            {insertionMode === 'replace'
              ? 'Replace in editor'
              : 'Paste into editor'}
          </span>
        </button>

        {/* Undo / Redo Toolbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
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
