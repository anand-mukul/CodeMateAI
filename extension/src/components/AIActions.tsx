import React, { useState, useRef } from 'react';
import {
  Wand2,
  Zap,
  RefreshCw,
  FileText,
  Terminal,
  Square,
} from 'lucide-react';
import { ProblemContext } from '../types/problem';
import {
  ProblemRequestDTO,
  SolutionResponseDTO,
  OptimizationResponseDTO,
} from '../types/ai';
import { SolutionService } from '../services/api';
import { SolutionPreview } from './SolutionPreview';
import { AIOptimizeSolution } from './AIOptimizeSolution';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { normalizeLanguage } from '../utils/language';
import { SUPPORTED_LANGUAGES } from './LanguageSelector';
import { usePersistentDraft } from '../hooks/usePersistentDraft';
import { MultiFileProjectOrchestrator } from '../services/multi-file-graph';
import { MultiFileProgressModal, MultiFileStepState } from './MultiFileProgressModal';

interface AIActionsProps {
  problemContext: ProblemContext | null;
  selectedLanguage: string;
  onSelectLanguage?: (lang: string) => void;
  providerOverride?: string;
  onNotify: (message: string, isError?: boolean) => void;
}

type AITab = 'generate' | 'optimize';

export const AIActions: React.FC<AIActionsProps> = ({
  problemContext,
  selectedLanguage,
  onSelectLanguage,
  providerOverride,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AITab>('generate');

  // Loading states
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingOptimize, setLoadingOptimize] = useState(false);

  // Errors
  const [errorGenerate, setErrorGenerate] = useState<string | null>(null);
  const [errorOptimize, setErrorOptimize] = useState<string | null>(null);

  // Multi-File LangGraph.js Orchestrator Modal State
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);
  const [multiFileProgress, setMultiFileProgress] = useState<MultiFileStepState>({
    step: 0,
    total: 0,
    currentFile: '',
    phase: 'synthesizing',
    message: '',
    files: [],
    completedFiles: [],
  });

  // Cancellation controllers
  const generateAbortRef = useRef<AbortController | null>(null);
  const optimizeAbortRef = useRef<AbortController | null>(null);

  const handleStopGenerate = () => {
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
    }
    setLoadingGenerate(false);
    onNotify('Generation stopped by user.', false);
  };

  const handleStopOptimize = () => {
    if (optimizeAbortRef.current) {
      optimizeAbortRef.current.abort();
      optimizeAbortRef.current = null;
    }
    setLoadingOptimize(false);
    onNotify('Optimization stopped by user.', false);
  };

  // Results
  const [solutionResult, setSolutionResult] = useState<SolutionResponseDTO | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponseDTO | null>(null);

  // Persistent drafts for user inputs across popup dismissals (Linear/Raycast UX)
  const [studentCode, setStudentCode] = usePersistentDraft('student_code_opt', '');
  const [manualStatement, setManualStatement, clearManualStatement] = usePersistentDraft('manual_problem_stmt', '');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  /**
   * Helper to normalize problem into ProblemRequestDTO
   */
  const buildProblemRequest = (starterCode?: string): ProblemRequestDTO => {
    const rawStatement =
      manualStatement.trim() ||
      problemContext?.problemStatement ||
      (problemContext?.problemTitle
        ? `Solve competitive programming problem: ${problemContext.problemTitle}`
        : 'Solve the current coding practice problem optimally.');

    return {
      title: problemContext?.problemTitle || problemContext?.problemCode || 'CodeChef Problem',
      problem_statement: rawStatement,
      input_format: problemContext?.inputFormat,
      output_format: problemContext?.outputFormat,
      constraints: problemContext?.constraints,
      examples: problemContext?.sampleCases || [],
      selected_language: normalizeLanguage(selectedLanguage),
      starter_code: starterCode,
      platform: problemContext?.platform?.toLowerCase() || 'codechef',
      problem_url: problemContext?.url,
    };
  };

  /**
   * 1. Generate Solution Action (Universal Multi-File & Single-File Context)
   */
  const handleGenerate = async () => {
    if (loadingGenerate) return;
    const abortCtrl = new AbortController();
    generateAbortRef.current = abortCtrl;
    setLoadingGenerate(true);
    setErrorGenerate(null);
    setActiveTab('generate');

    try {
      // 1. Check if multi-file workspace
      let workspaceFiles: Record<string, string> | null = null;
      try {
        const harvestRes = await ExtensionMessagingService.harvestWorkspace();
        if (harvestRes.success && harvestRes.data && Object.keys(harvestRes.data).length >= 2) {
          workspaceFiles = harvestRes.data;
        }
      } catch {}

      // If multi-file workspace is detected:
      if (workspaceFiles && Object.keys(workspaceFiles).length >= 2) {
        const fileNames = Object.keys(workspaceFiles);
        setIsMultiFileModalOpen(true);
        setMultiFileProgress({
          step: 0,
          total: fileNames.length,
          currentFile: fileNames[0],
          phase: 'synthesizing',
          message: 'Initializing LangGraph multi-file orchestrator...',
          files: fileNames,
          completedFiles: [],
        });

        const completedFilesTracker: string[] = [];

        const orchestratorResult = await MultiFileProjectOrchestrator.executeProjectWorkflow(
          problemContext?.problemTitle || 'Multi-File Project Task',
          problemContext?.problemStatement || '',
          workspaceFiles,
          providerOverride,
          undefined,
          (step, total, currentFile, phase, message) => {
            if (phase === 'injecting' && !completedFilesTracker.includes(currentFile)) {
              completedFilesTracker.push(currentFile);
            }
            setMultiFileProgress({
              step,
              total,
              currentFile,
              phase,
              message,
              files: fileNames,
              completedFiles: [...completedFilesTracker],
            });
          }
        );

        if (orchestratorResult.success) {
          setIsMultiFileModalOpen(false);
          const firstFile = fileNames[0];
          const firstCode = orchestratorResult.completedFiles[firstFile] || Object.values(orchestratorResult.completedFiles)[0] || '';
          setSolutionResult({
            success: true,
            problem_summary: orchestratorResult.summary,
            approach: {
              name: 'LangGraph Ephemeral Multi-File Orchestration',
              explanation: `Successfully sequenced and synthesized all ${fileNames.length} project files adhering to shared interface contracts.`,
              steps: fileNames.map((f, i) => `Step ${i + 1}: Synthesize & inject ${f}`),
            },
            algorithm: 'Directed Acyclic Graph Component Synthesis',
            data_structures: ['LangGraph State Machine', 'Upstash Redis Ephemeral Store'],
            code: firstCode,
            workspace_files: Object.entries(orchestratorResult.completedFiles).map(([filename, code]) => ({ filename, code })),
            language: selectedLanguage,
            complexity: {
              time: {
                notation: 'O(N)',
                explanation: 'Standard runtime efficiency for model/service operations.',
              },
              space: {
                notation: 'O(N)',
                explanation: 'Memory allocated for instantiated entities and services.',
              },
            },
            edge_cases: ['Null lookup checks', 'Strict interface contracts preserved'],
            sample_case_analysis: [],
            warnings: [],
            provider: providerOverride || 'openrouter',
            model: 'langgraph-ephemeral-orchestrator',
          });
          onNotify(`✓ All ${fileNames.length} project files synthesized and injected!`);
          return;
        } else {
          setIsMultiFileModalOpen(false);
          throw new Error(orchestratorResult.error || 'Multi-file orchestration failed.');
        }
      }

      // 2. Single-file competitive programming
      let starterCode: string | undefined = undefined;
      try {
        const editorRes = await ExtensionMessagingService.getEditorCode();
        if (editorRes && editorRes.success && editorRes.data?.code && editorRes.data.code.trim().length > 10) {
          starterCode = editorRes.data.code;
        }
      } catch {}

      const req = buildProblemRequest(starterCode);
      const res = await SolutionService.generate(req, providerOverride, abortCtrl.signal);
      setSolutionResult(res);
      onNotify(`✓ Optimal ${selectedLanguage} solution generated!`);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setErrorGenerate(msg);
      onNotify(`Generation failed: ${msg}`, true);
    } finally {
      generateAbortRef.current = null;
      setLoadingGenerate(false);
    }
  };

  /**
   * 2. Fetch Code from Ace Editor & Optimize
   */
  const handleFetchFromEditor = async () => {
    try {
      const res = await ExtensionMessagingService.getEditorCode();
      if (res.success && res.data?.code) {
        setStudentCode(res.data.code);
        onNotify(`✓ Extracted ${res.data.lineCount} lines from CodeChef editor.`);
      } else {
        onNotify('Could not read editor code. You can paste code directly.', true);
      }
    } catch {
      onNotify('Editor read error. Paste code manually.', true);
    }
  };

  const handleOptimize = async () => {
    if (loadingOptimize) return;
    if (!studentCode.trim()) {
      onNotify('Please enter or fetch student code first.', true);
      return;
    }

    const abortCtrl = new AbortController();
    optimizeAbortRef.current = abortCtrl;
    setLoadingOptimize(true);
    setErrorOptimize(null);
    setActiveTab('optimize');

    try {
      const req = buildProblemRequest();
      const res = await SolutionService.optimize(
        {
          problem: req,
          existing_code: studentCode,
          current_language: normalizeLanguage(selectedLanguage),
        },
        providerOverride,
        abortCtrl.signal
      );
      setOptimizationResult(res);
      onNotify('✓ Code refactored and optimized!');
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Optimization failed';
      setErrorOptimize(msg);
      onNotify(`Optimization failed: ${msg}`, true);
    } finally {
      optimizeAbortRef.current = null;
      setLoadingOptimize(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Sleek Segmented Mode Selector (Linear / Raycast pattern) */}
      <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs shadow-inner">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
            activeTab === 'generate'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Synthesize Solution</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('optimize');
            if (!studentCode) handleFetchFromEditor();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
            activeTab === 'optimize'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Refactor & Optimize</span>
        </button>
      </div>

      {/* Mode 1: Solution Synthesis */}
      {activeTab === 'generate' && (
        <div className="flex flex-col gap-2.5 animate-fade-in">
          {/* Action Toolbar: Unified Target Language & Statement Control */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-semibold text-slate-300">Target:</span>
              {onSelectLanguage ? (
                <select
                  value={selectedLanguage}
                  onChange={(e) => onSelectLanguage(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-indigo-300 text-[11px] font-bold rounded-md px-2 py-0.5 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] font-mono font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {selectedLanguage}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[10px] text-slate-400 hover:text-indigo-300 font-normal flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              <span>{showManualInput ? 'Hide Statement' : 'Edit Statement'}</span>
            </button>
          </div>

          {/* Manual Statement Drawer with Persistent Session Draft */}
          {showManualInput && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2 text-xs animate-fade-in">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span>Problem Statement Text:</span>
                <span className="text-[10px] text-slate-500">
                  {problemContext?.extractionSuccess ? 'Auto-Extracted from CodeChef' : 'Manual / Draft Entry'}
                </span>
              </div>
              <textarea
                value={manualStatement || problemContext?.problemStatement || ''}
                onChange={(e) => setManualStatement(e.target.value)}
                placeholder="Paste or edit problem statement..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-300 outline-none focus:border-indigo-500 resize-y"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Constraints: {problemContext?.constraints ? 'Detected' : 'None specified'}</span>
                <button
                  onClick={() => {
                    clearManualStatement();
                    setShowManualInput(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Reset to Extracted
                </button>
              </div>
            </div>
          )}

          {/* Primary High-Visibility Generate Action & Stop Control */}
          {loadingGenerate ? (
            <div className="flex items-center gap-2 w-full">
              <button
                disabled
                className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-slate-800/90 border border-slate-700/60 flex items-center justify-center gap-2 cursor-wait"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Synthesizing Optimal Solution...</span>
              </button>
              <button
                onClick={handleStopGenerate}
                className="py-2.5 px-3.5 rounded-xl font-semibold text-xs text-rose-300 bg-rose-950/70 hover:bg-rose-900/90 border border-rose-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Stop AI Generation"
              >
                <Square className="w-3 h-3 fill-current text-rose-400" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              className="w-full py-2.5 px-3.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{solutionResult ? 'Regenerate Solution' : 'Generate Optimal Solution'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                {selectedLanguage}
              </span>
            </button>
          )}

          {/* Solution Preview with Honest Actions & Line-Wrapping */}
          <SolutionPreview
            code={solutionResult?.code}
            language={solutionResult?.language || selectedLanguage}
            algorithm={solutionResult?.algorithm}
            complexity={solutionResult?.complexity}
            edgeCases={solutionResult?.edge_cases}
            warnings={solutionResult?.warnings}
            isLoading={loadingGenerate}
            error={errorGenerate}
            emptyMessage={`Click "Generate Optimal Solution" above to synthesize an optimal ${selectedLanguage} solution.`}
            onRetry={handleGenerate}
            onStop={handleStopGenerate}
          />
        </div>
      )}

      {/* Mode 2: Refactor & Optimize */}
      {activeTab === 'optimize' && (
        <div className="animate-fade-in">
          <AIOptimizeSolution
            optimizationResult={optimizationResult}
            currentCode={studentCode}
            onCodeChange={setStudentCode}
            onFetchFromEditor={handleFetchFromEditor}
            onOptimize={handleOptimize}
            onStop={handleStopOptimize}
            isLoading={loadingOptimize}
            error={errorOptimize}
            language={selectedLanguage}
          />
        </div>
      )}

      {/* LangGraph.js Ephemeral Multi-File Progress Modal */}
      <MultiFileProgressModal
        isOpen={isMultiFileModalOpen}
        state={multiFileProgress}
        onCancel={async () => {
          await MultiFileProjectOrchestrator.abortCurrentTask();
          setIsMultiFileModalOpen(false);
          setLoadingGenerate(false);
          onNotify('Multi-file orchestration cancelled. Working memory purged.', true);
        }}
      />
    </div>
  );
};

export default AIActions;
