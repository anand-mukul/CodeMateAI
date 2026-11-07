import React, { useState } from 'react';
import {
  Wand2,
  Zap,
  RefreshCw,
  FileText,
  Terminal,
} from 'lucide-react';
import { ProblemContext } from '../types/problem';
import {
  ProblemRequestDTO,
  SolutionResponseDTO,
  OptimizationResponseDTO,
} from '../types/ai';
import { SolutionService, CodeMateApiClient } from '../services/api';
import { SolutionPreview } from './SolutionPreview';
import { AIOptimizeSolution } from './AIOptimizeSolution';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { normalizeLanguage } from '../utils/language';
import { SUPPORTED_LANGUAGES } from './LanguageSelector';
import { usePersistentDraft } from '../hooks/usePersistentDraft';

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
        const editorRes = await ExtensionMessagingService.getEditorCode();
        const activeCode = editorRes?.data?.code || Object.values(workspaceFiles)[0] || '';

        let activeFileName = '';
        for (const [fname, code] of Object.entries(workspaceFiles)) {
          if (
            activeCode &&
            code &&
            (activeCode.slice(0, 80).includes(code.slice(0, 80)) || code.slice(0, 80).includes(activeCode.slice(0, 80)))
          ) {
            activeFileName = fname;
            break;
          }
        }
        if (!activeFileName) {
          activeFileName = Object.keys(workspaceFiles)[0];
        }

        onNotify(`Generating solution for ${activeFileName} using ${Object.keys(workspaceFiles).length}-file project context...`);

        const completeRes = await CodeMateApiClient.request<{ filename: string; code: string; explanation?: string }>(
          '/api/projects/ephemeral/complete-file',
          {
            method: 'POST',
            body: JSON.stringify({
              filename: activeFileName,
              file_content: activeCode,
              problem_title: problemContext?.problemTitle || 'Project Task',
              problem_statement: problemContext?.problemStatement || '',
              selected_language: normalizeLanguage(selectedLanguage),
              completed_files_context: workspaceFiles,
            }),
          },
          2,
          providerOverride,
          'GENERATE'
        );

        if (completeRes?.code) {
          setSolutionResult({
            success: true,
            problem_summary: `Completed ${activeFileName} using multi-file project context.`,
            approach: {
              name: 'Ephemeral Multi-File Component Implementation',
              explanation: completeRes.explanation || `Completed ${activeFileName} using multi-file project context.`,
              steps: [`Resolve ${activeFileName}`, 'Maintain clean class interfaces'],
            },
            algorithm: 'Architectural Component Synthesis',
            data_structures: ['Dependency Injection Container', 'Java Stream API'],
            code: completeRes.code,
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
            edge_cases: ['Null lookup checks', 'Empty collection returns'],
            sample_case_analysis: [],
            warnings: [],
            provider: providerOverride || 'gemini',
            model: 'ephemeral-project-worker',
          });
          onNotify(`✓ Generated ${activeFileName} with multi-file project context!`);
          return;
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
      const res = await SolutionService.generate(req, providerOverride);
      setSolutionResult(res);
      onNotify(`✓ Optimal ${selectedLanguage} solution generated!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setErrorGenerate(msg);
      onNotify(`Generation failed: ${msg}`, true);
    } finally {
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
        providerOverride
      );
      setOptimizationResult(res);
      onNotify('✓ Code refactored and optimized!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Optimization failed';
      setErrorOptimize(msg);
      onNotify(`Optimization failed: ${msg}`, true);
    } finally {
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
          <span>Generate Solution</span>
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

          {/* Primary High-Visibility Generate Action */}
          <button
            onClick={handleGenerate}
            disabled={loadingGenerate}
            className="w-full py-2.5 px-3.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {loadingGenerate ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Optimal Solution...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>{solutionResult ? 'Regenerate Solution' : 'Generate Optimal Solution'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                  {selectedLanguage}
                </span>
              </>
            )}
          </button>

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
            isLoading={loadingOptimize}
            error={errorOptimize}
            language={selectedLanguage}
          />
        </div>
      )}
    </div>
  );
};

export default AIActions;
