import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Copy,
  Check,
  ArrowRight,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SnippetManager as StorageSnippetManager } from '../clipboard/clipboard-history';
import { Snippet } from '../types/clipboard';
import { ClipboardManager } from '../clipboard/clipboard-manager';
import { ExtensionMessagingService } from '../services/extension-messaging';

interface SnippetManagerProps {
  currentCode?: string;
  onInsertionSuccess?: () => void;
  onNotify?: (message: string, isError?: boolean) => void;
}

export const SnippetManager: React.FC<SnippetManagerProps> = ({
  currentCode = '',
  onInsertionSuccess,
  onNotify,
}) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'templates'>('all');

  const refreshSnippets = async () => {
    const list = await StorageSnippetManager.getSnippets();
    setSnippets(list);
  };

  useEffect(() => {
    refreshSnippets();
  }, []);

  const notify = (msg: string, isError = false) => {
    if (onNotify) onNotify(msg, isError);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToSave = newCode.trim() || currentCode.trim();
    if (!codeToSave) {
      notify('Please provide code to save in snippet.', true);
      return;
    }

    try {
      await StorageSnippetManager.saveSnippet(newTitle, codeToSave);
      setNewTitle('');
      setNewCode('');
      setIsSaving(false);
      await refreshSnippets();
      notify('✓ Snippet saved successfully.');
    } catch {
      notify('Failed to save snippet.', true);
    }
  };

  const handleCopy = async (snippet: Snippet) => {
    try {
      await ClipboardManager.writeText(snippet.code);
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 2000);
      notify(`✓ Copied "${snippet.title}" to clipboard.`);
    } catch {
      notify('Failed to copy snippet.', true);
    }
  };

  const handleInsert = async (snippet: Snippet) => {
    try {
      const res = await ExtensionMessagingService.insertCode({
        code: snippet.code,
        mode: 'cursor',
      });

      if (res.success && res.data && res.data.success) {
        notify(`✓ Inserted "${snippet.title}" into CodeChef Ace Editor.`);
        if (onInsertionSuccess) onInsertionSuccess();
      } else {
        notify(`Insertion failed: ${res.data?.error || res.error || 'Editor not reachable'}`, true);
      }
    } catch (err) {
      notify(`Insertion error: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await StorageSnippetManager.deleteSnippet(id);
      await refreshSnippets();
      notify(`Snippet "${title}" removed.`);
    } catch {
      notify('Failed to delete snippet.', true);
    }
  };

  const filteredSnippets = snippets.filter((s) => {
    if (activeTab === 'custom') return !s.isPredefined;
    if (activeTab === 'templates') return !!s.isPredefined;
    return true;
  });

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Bookmark className="w-4 h-4 text-purple-400" />
          <span>Reusable Code Snippets</span>
        </div>

        <button
          onClick={() => {
            setIsSaving(!isSaving);
            if (!newCode && currentCode) setNewCode(currentCode);
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Cancel' : 'Save Snippet'}</span>
        </button>
      </div>

      {/* Save Form */}
      {isSaving && (
        <form onSubmit={handleSave} className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 animate-fade-in">
          <input
            type="text"
            placeholder="Snippet Name (e.g. My Fast Binary Search)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-750 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
          <textarea
            placeholder="Paste or enter snippet code..."
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            rows={4}
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-750 font-mono text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
          <button
            type="submit"
            className="self-end px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Save to Local Storage
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
            activeTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({snippets.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
            activeTab === 'templates' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Templates ({snippets.filter((s) => s.isPredefined).length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
            activeTab === 'custom' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Custom ({snippets.filter((s) => !s.isPredefined).length})
        </button>
      </div>

      {/* Snippet List */}
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-[11px] italic">
            No snippets found in this category.
          </div>
        ) : (
          filteredSnippets.map((snippet) => {
            const isExpanded = expandedId === snippet.id;
            return (
              <div
                key={snippet.id}
                className="flex flex-col rounded-lg bg-slate-950 border border-slate-800 p-2.5 gap-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-medium text-slate-200 truncate text-[11px]" title={snippet.title}>
                      {snippet.title}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-indigo-300 shrink-0">
                      {snippet.language}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(snippet)}
                      title="Copy code"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {copiedId === snippet.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      onClick={() => handleInsert(snippet)}
                      title="Insert into CodeChef editor"
                      className="p-1 rounded text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {!snippet.isPredefined && (
                      <button
                        onClick={() => handleDelete(snippet.id, snippet.title)}
                        title="Delete snippet"
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : snippet.id)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-1 p-2 rounded bg-[#070b14] border border-slate-850 font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre">
                    <code>{snippet.code}</code>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

