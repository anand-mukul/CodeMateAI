import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RefreshCw,
  FileText,
  Terminal,
  Square,
  FolderGit2,
  CheckCircle2,
  FileCode,
  Trash2,
} from 'lucide-react';
import { ProblemContext } from '../types/problem';
import {
  ProblemRequestDTO,
  SolutionResponseDTO,
  OptimizationResponseDTO,
} from '../types/ai';
import { SolutionService } from '../services/api';
import { ProjectService } from '../services/project-service';
import { SolutionPreview } from './SolutionPreview';
import { AIOptimizeSolution } from './AIOptimizeSolution';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { normalizeLanguage } from '../utils/language';
import { SUPPORTED_LANGUAGES } from './LanguageSelector';
import { usePersistentDraft } from '../hooks/usePersistentDraft';
import { useAuth } from '../context/AuthContext';
import { ClipboardManager } from '../clipboard/clipboard-manager';

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
  const { user, subscription } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isPrivileged = userRole === 'ADMIN';
  const planId = (subscription?.plan_id || '').toUpperCase();
  const hasOneClick =
    isPrivileged ||
    planId === 'PLAN_CORE_PASS' ||
    planId === 'PLAN_AUTOPILOT_PASS' ||
    (subscription?.entitlements?.includes('one_click_insert') ?? false);

  const [activeTab, setActiveTab] = useState<AITab>('generate');

  // Loading states
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingOptimize, setLoadingOptimize] = useState(false);

  // Errors
  const [errorGenerate, setErrorGenerate] = useState<string | null>(null);
  const [errorOptimize, setErrorOptimize] = useState<string | null>(null);

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

  // Multi-File Project Architecture Session State (Practice Section History)
  const [multiFileSession, setMultiFileSession] = useState<any>(null);
  const [regeneratingFile, setRegeneratingFile] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['codemate_multifile_session_v1'], (st) => {
          setMultiFileSession(st?.codemate_multifile_session_v1 || null);
        });
      }
    };
    loadSession();

    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes['codemate_multifile_session_v1']) {
        setMultiFileSession(changes['codemate_multifile_session_v1'].newValue || null);
      }
    };
    chrome.storage?.onChanged?.addListener(storageListener);
    return () => {
      chrome.storage?.onChanged?.removeListener(storageListener);
    };
  }, []);

  // Reactive Memory Context Eviction: Automatically flush cached session when problem statement changes
  useEffect(() => {
    const currentTitle = (problemContext?.problemTitle || problemContext?.problemCode || '').trim();
    if (multiFileSession && currentTitle && multiFileSession.problem_title) {
      const sessTitle = (multiFileSession.problem_title || '').trim();
      if (sessTitle !== currentTitle) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(['codemate_multifile_session_v1'], () => {
            setMultiFileSession(null);
          });
          ProjectService.clearEphemeralContext();
        }
      }
    }
  }, [problemContext?.problemTitle, problemContext?.problemCode, multiFileSession]);

  const handleClearSession = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['codemate_multifile_session_v1'], () => {
        setMultiFileSession(null);
        onNotify('Multi-file project session cleared.', false);
      });
      ProjectService.clearEphemeralContext();
    }
  };

  const lookupFileContent = (fileMap: Record<string, string> | undefined, targetFilename: string): string => {
    if (!fileMap || !targetFilename) return '';
    if (fileMap[targetFilename]) return fileMap[targetFilename];

    const targetClean = targetFilename.toLowerCase().replace(/^[\\\/]+/, '');
    const targetBase = targetClean.split('/').pop()?.split('\\').pop() || targetClean;

    for (const [key, content] of Object.entries(fileMap)) {
      const keyClean = key.toLowerCase().replace(/^[\\\/]+/, '');
      const keyBase = keyClean.split('/').pop()?.split('\\').pop() || keyClean;
      if (keyBase === targetBase || keyClean.endsWith('/' + targetBase) || keyClean.endsWith('\\' + targetBase)) {
        return content;
      }
    }
    return '';
  };

  const handleSyncFileToEditor = async (filename: string, code: string) => {
    const baseName = filename.split('/').pop() || filename;
    const targetFileObj = multiFileSession?.files?.find((f: any) => f.filename === filename);

    // Update Solution Preview immediately
    setSolutionResult({
      success: true,
      problem_summary: `Multi-File Architecture: ${baseName}`,
      approach: {
        name: `${targetFileObj?.role || 'Component'} Implementation`,
        explanation: `Solved ${baseName} (${targetFileObj?.role || 'Component'}) matching all project requirements and shared schemas.`,
        steps: ['Analyzed shared schema', 'Implemented component logic', 'Preserved interface contracts'],
      },
      algorithm: 'Architectural Component Implementation',
      data_structures: ['Entities', 'Services', 'State'],
      code,
      language: selectedLanguage,
      complexity: {
        time: { notation: 'O(1)', explanation: 'Lifecycle operations run in standard time' },
        space: { notation: 'O(N)', explanation: 'Entities scale linearly with data' },
      },
      edge_cases: [],
      sample_case_analysis: [],
      warnings: [],
      provider: providerOverride || 'gemini',
      model: 'gemini-3.8-flash',
    });

    try {
      if (hasOneClick) {
        // Switch tab first and verify active tab
        await ExtensionMessagingService.switchTab(filename);
        await new Promise((r) => setTimeout(r, 150));

        const res = await ExtensionMessagingService.insertCode({
          code,
          mode: 'replace',
          targetFile: filename,
        });
        if (res?.success) {
          onNotify(`✓ Replaced ${baseName} in active editor`, false);
        } else {
          await ClipboardManager.copyCode(code);
          onNotify(`Copied ${baseName} to clipboard! Paste into editor (Ctrl+V)`, false);
        }
      } else {
        await ClipboardManager.copyCode(code);
        onNotify(`✓ Copied ${baseName} to clipboard! Paste into ${baseName} (Ctrl+V)`, false);
      }
    } catch {
      await ClipboardManager.copyCode(code);
      onNotify(`Copied ${baseName} to clipboard! Paste into editor (Ctrl+V)`, false);
    }
  };

  const handleRegenerateFile = async (filename: string) => {
    if (!multiFileSession) return;
    setRegeneratingFile(filename);
    const baseName = filename.split('/').pop() || filename;
    onNotify(`Regenerating ${baseName}...`, false);

    try {
      const completedFilesContext: Record<string, string> = {};
      if (Array.isArray(multiFileSession.files)) {
        for (const f of multiFileSession.files) {
          if (f.code && f.filename !== filename) {
            completedFilesContext[f.filename] = f.code;
          }
        }
      }

      const settings: any = await new Promise((res) => {
        chrome.storage.local.get(['codemate_ai_settings_v1', 'codemate_provider_selection_v1', 'codemate_api_keys_v1'], res);
      });
      const baseUrl = settings?.codemate_ai_settings_v1?.backendUrl || 'http://localhost:8000';
      const activeProvider = providerOverride || settings?.codemate_provider_selection_v1?.provider || 'gemini';
      const activeModel = settings?.codemate_provider_selection_v1?.model || 'gemini-3.8-flash';
      const apiKey = settings?.codemate_api_keys_v1?.[activeProvider] || undefined;

      const targetFileObj = multiFileSession.files?.find((f: any) => f.filename === filename);
      const initialCode =
        targetFileObj?.initial_code ||
        lookupFileContent(multiFileSession.initial_files, filename) ||
        '';

      const reqPayload = {
        project_id: multiFileSession.project_id || 'manual_session',
        filename,
        file_content: initialCode,
        problem_title: multiFileSession.problem_title || problemContext?.problemTitle || 'Task',
        problem_statement: multiFileSession.problem_statement || problemContext?.problemStatement || '',
        selected_language: multiFileSession.selected_language || selectedLanguage || 'java',
        completed_files_context: completedFilesContext,
      };

      const res: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SECURE_FORWARD_API',
            endpoint: '/api/projects/ephemeral/complete-file',
            payload: reqPayload,
            baseUrl,
            provider: activeProvider,
            model: activeModel,
            apiKey,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          }
        );
      });

      if (res?.success && res.data?.code) {
        const newCode = res.data.code;
        const updated = { ...multiFileSession };
        if (Array.isArray(updated.files)) {
          const target = updated.files.find((f: any) => f.filename === filename);
          if (target) {
            target.code = newCode;
            target.status = 'completed';
          }
        }
        chrome.storage.local.set({ codemate_multifile_session_v1: updated });
        setMultiFileSession(updated);

        // Update Solution Preview as well
        setSolutionResult({
          success: true,
          problem_summary: `Multi-File Architecture: ${baseName}`,
          approach: {
            name: `${targetFileObj?.role || 'Component'} Implementation`,
            explanation: `Regenerated ${baseName} using shared project architectural context.`,
            steps: ['Analyzed shared schema', 'Regenerated component logic', 'Preserved contracts'],
          },
          algorithm: 'Architectural Component Implementation',
          data_structures: ['Entities', 'Services', 'State'],
          code: newCode,
          language: selectedLanguage,
          complexity: {
            time: { notation: 'O(1)', explanation: 'Standard component lifecycle' },
            space: { notation: 'O(N)', explanation: 'Data structures scale linearly' },
          },
          edge_cases: [],
          sample_case_analysis: [],
          warnings: [],
          provider: activeProvider,
          model: activeModel,
        });

        if (hasOneClick) {
          await ExtensionMessagingService.insertCode({
            code: newCode,
            mode: 'replace',
            targetFile: filename,
          });
          onNotify(`✓ ${baseName} regenerated and synced to editor!`, false);
        } else {
          await ClipboardManager.copyCode(newCode);
          onNotify(`✓ ${baseName} regenerated! Copied to clipboard — paste into editor (Ctrl+V)`, false);
        }
      } else {
        throw new Error(res?.error || 'Failed to regenerate code');
      }
    } catch (err: any) {
      onNotify(`Regeneration failed: ${err.message}`, true);
    } finally {
      setRegeneratingFile(null);
    }
  };

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
   * 1. Generate Solution Action (Single Active File Focus with Project Memory Context)
   * Solves ONLY the currently active open file while retaining full workspace memory of other files.
   * Full multi-file autonomous runs are reserved for 1-Click Auto Solve / Assistant.
   */
  const handleGenerate = async () => {
    if (loadingGenerate) return;
    const abortCtrl = new AbortController();
    generateAbortRef.current = abortCtrl;
    setLoadingGenerate(true);
    setErrorGenerate(null);
    setActiveTab('generate');

    try {
      // 1. Fetch current open editor code and active tab name
      let starterCode: string | undefined = undefined;
      let activeFileName: string | null = null;
      try {
        const editorRes = await ExtensionMessagingService.getEditorCode();
        if (editorRes && editorRes.success && editorRes.data) {
          starterCode = editorRes.data.code;
          activeFileName = editorRes.data.activeTab || null;
        }
      } catch {}

      // 2. Harvest project workspace files into memory context (prevents contract drift)
      let workspaceFiles: Record<string, string> | undefined = undefined;
      try {
        const harvestRes = await ExtensionMessagingService.harvestWorkspace();
        if (harvestRes.success && harvestRes.data && Object.keys(harvestRes.data).length >= 2) {
          workspaceFiles = harvestRes.data;
        }
      } catch {}

      // 3. Build focused problem request for the active file
      const rawStatement =
        manualStatement.trim() ||
        problemContext?.problemStatement ||
        (problemContext?.problemTitle
          ? `Solve coding practice problem: ${problemContext.problemTitle}`
          : 'Solve the current coding practice problem optimally.');

      const statementWithContext = activeFileName
        ? `CURRENT OPEN FILE TO IMPLEMENT: ${activeFileName}\n\nInstructions: Implement ONLY ${activeFileName}. Do not replace with another class. Follow all shared project types and conventions.\n\n${rawStatement}`
        : rawStatement;

      const titleWithFile = activeFileName
        ? `${problemContext?.problemTitle || 'Task'} — ${activeFileName}`
        : (problemContext?.problemTitle || problemContext?.problemCode || 'CodeChef Problem');

      // Auto-detect active file language if it differs from current selector
      let targetLang = selectedLanguage;
      if (activeFileName?.endsWith('.java') || /package\s+[a-zA-Z0-9_\.]+;|import\s+java\./.test(starterCode || '')) {
        targetLang = 'Java';
      } else if (activeFileName?.endsWith('.py')) {
        targetLang = 'Python3';
      } else if (activeFileName?.endsWith('.cpp') || activeFileName?.endsWith('.cc')) {
        targetLang = 'C++';
      }
      if (onSelectLanguage && targetLang !== selectedLanguage) {
        onSelectLanguage(targetLang);
      }

      // Check if this is a Multi-File Project (>= 2 files harvested)
      if (workspaceFiles && Object.keys(workspaceFiles).length >= 2) {
        const settings: any = await new Promise((res) => {
          chrome.storage.local.get(['codemate_ai_settings_v1', 'codemate_provider_selection_v1', 'codemate_api_keys_v1'], res);
        });
        const baseUrl = settings?.codemate_ai_settings_v1?.backendUrl || 'http://localhost:8000';
        const activeProvider = providerOverride || settings?.codemate_provider_selection_v1?.provider || 'gemini';
        const activeModel = settings?.codemate_provider_selection_v1?.model || 'gemini-3.8-flash';
        const apiKey = settings?.codemate_api_keys_v1?.[activeProvider] || undefined;

        let session = multiFileSession;
        const currentTitle = (problemContext?.problemTitle || problemContext?.problemCode || 'Task').trim();

        // Check if there are newly harvested workspace files not yet represented in the active session
        const sessionFileNames = new Set(
          (session?.files || []).map((f: any) =>
            (f.filename || '').split('/').pop()?.split('\\').pop()?.trim().toLowerCase()
          )
        );

        const hasNewHarvestedFiles = Object.keys(workspaceFiles).some((wf) => {
          const base = wf.split('/').pop()?.split('\\').pop()?.trim().toLowerCase();
          return base && !sessionFileNames.has(base);
        });

        const shouldReArchitect =
          !session ||
          session.problem_title !== currentTitle ||
          !Array.isArray(session.files) ||
          session.files.length === 0 ||
          hasNewHarvestedFiles;

        // Step A: Initialize blueprint & multi-file card if not created or if new workspace files discovered
        if (shouldReArchitect) {
          onNotify(
            hasNewHarvestedFiles
              ? 'Discovered newly opened project files — updating architectural blueprint...'
              : 'Architecting multi-file project blueprint...',
            false
          );
          const blueprintRes: any = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'SECURE_FORWARD_API',
                endpoint: '/api/projects/ephemeral/blueprint',
                payload: {
                  workspace_files: workspaceFiles,
                  problem_title: currentTitle,
                  problem_statement: rawStatement,
                  selected_language: normalizeLanguage(targetLang),
                },
                baseUrl,
                provider: activeProvider,
                model: activeModel,
                apiKey,
              },
              (r) => resolve(r)
            );
          });

          if (blueprintRes?.success && blueprintRes.data?.execution_plan) {
            const actionable = blueprintRes.data.execution_plan.filter((s: any) => s.action === 'MODIFY');
            // Natural Tab-Order: Prioritize active tab if focused
            if (activeFileName) {
              const activeLower = activeFileName.toLowerCase();
              actionable.sort((a: any, b: any) => {
                const aMatch = activeLower.includes(a.filename.toLowerCase()) || a.filename.toLowerCase().includes(activeLower);
                const bMatch = activeLower.includes(b.filename.toLowerCase()) || b.filename.toLowerCase().includes(activeLower);
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
              });
            }

            // Retain any completed file solutions already generated in this session
            const previousCompleted = new Map<string, { code: string; status: string }>();
            if (session && Array.isArray(session.files)) {
              for (const pf of session.files) {
                if (pf.code && pf.status === 'completed') {
                  const b = (pf.filename || '').split('/').pop()?.split('\\').pop()?.toLowerCase();
                  if (b) previousCompleted.set(b, { code: pf.code, status: pf.status });
                }
              }
            }

            session = {
              project_id: blueprintRes.data.project_id || 'proj_session',
              problem_title: currentTitle,
              problem_statement: rawStatement,
              selected_language: normalizeLanguage(targetLang),
              total_files: actionable.length,
              status: 'in_progress',
              timestamp: Date.now(),
              initial_files: { ...(session?.initial_files || {}), ...workspaceFiles },
              files: actionable.map((s: any) => {
                const b = (s.filename || '').split('/').pop()?.split('\\').pop()?.toLowerCase();
                const prev = b ? previousCompleted.get(b) : null;
                return {
                  filename: s.filename,
                  role: s.role,
                  action: s.action,
                  reason: s.reason,
                  status: prev ? prev.status : 'pending',
                  code: prev ? prev.code : '',
                };
              }),
            };
            chrome.storage.local.set({ codemate_multifile_session_v1: session });
            setMultiFileSession(session);
          }
        }

        // Step B: Pick target file to solve (prioritize active tab if pending, or first pending step, or active tab to re-solve)
        let targetFile = '';
        if (session && Array.isArray(session.files)) {
          // If active tab matches a pending file, prioritize solving that file first
          if (activeFileName) {
            const activeLower = activeFileName.toLowerCase();
            const matched = session.files.find((f: any) =>
              activeLower.includes(f.filename.toLowerCase()) || f.filename.toLowerCase().includes(activeLower)
            );
            if (matched && matched.status !== 'completed') {
              targetFile = matched.filename;
            }
          }
          // Otherwise find the first pending file in the project
          if (!targetFile) {
            const firstPending = session.files.find((f: any) => f.status !== 'completed');
            if (firstPending) {
              targetFile = firstPending.filename;
            }
          }
          // If all files are completed, but user clicked Generate while focused on a file, re-solve that file
          if (!targetFile && activeFileName) {
            const activeLower = activeFileName.toLowerCase();
            const matched = session.files.find((f: any) =>
              activeLower.includes(f.filename.toLowerCase()) || f.filename.toLowerCase().includes(activeLower)
            );
            if (matched) {
              targetFile = matched.filename;
            }
          }
          // Fallback to first file
          if (!targetFile) {
            targetFile = session.files[0]?.filename || '';
          }
        }

        if (targetFile && session) {
          const baseName = targetFile.split('/').pop() || targetFile;
          onNotify(`Solving ${baseName}...`, false);

          const completedFilesContext: Record<string, string> = {};
          for (const f of session.files) {
            if (f.code && f.filename !== targetFile) {
              completedFilesContext[f.filename] = f.code;
            }
          }

          const targetFileObj = session.files.find((f: any) => f.filename === targetFile);
          const initialCode =
            targetFileObj?.initial_code ||
            lookupFileContent(session.initial_files, targetFile) ||
            lookupFileContent(workspaceFiles, targetFile) ||
            (activeFileName && activeFileName.toLowerCase().includes(baseName.toLowerCase()) ? (starterCode || '') : '') ||
            '';

          const completeRes: any = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: 'SECURE_FORWARD_API',
                endpoint: '/api/projects/ephemeral/complete-file',
                payload: {
                  project_id: session.project_id || 'proj_session',
                  filename: targetFile,
                  file_content: initialCode,
                  problem_title: currentTitle,
                  problem_statement: rawStatement,
                  selected_language: normalizeLanguage(targetLang),
                  completed_files_context: completedFilesContext,
                },
                baseUrl,
                provider: activeProvider,
                model: activeModel,
                apiKey,
              },
              (r) => resolve(r)
            );
          });

          if (completeRes?.success && completeRes.data?.code) {
            const newCode = completeRes.data.code;
            const updated = { ...session };
            if (Array.isArray(updated.files)) {
              const tgt = updated.files.find((f: any) => f.filename === targetFile);
              if (tgt) {
                tgt.code = newCode;
                tgt.status = 'completed';
              }
            }
            chrome.storage.local.set({ codemate_multifile_session_v1: updated });
            setMultiFileSession(updated);

            // Display in Solution Preview below
            setSolutionResult({
              success: true,
              problem_summary: `Multi-File Architecture: ${baseName}`,
              approach: {
                name: `${targetFileObj?.role || 'Component'} Implementation`,
                explanation: `Solved ${baseName} (${targetFileObj?.role || 'Component'}) matching all project requirements and shared schemas.`,
                steps: ['Analyzed shared schema', 'Implemented component logic', 'Preserved interface contracts'],
              },
              algorithm: 'Architectural Component Implementation',
              data_structures: ['Entities', 'Services', 'State'],
              code: newCode,
              language: targetLang,
              complexity: {
                time: { notation: 'O(1)', explanation: 'Lifecycle operations run in standard time' },
                space: { notation: 'O(N)', explanation: 'Entities scale linearly with data' },
              },
              edge_cases: [],
              sample_case_analysis: [],
              warnings: [],
              provider: activeProvider,
              model: activeModel,
            });

            // Action: Auto-insert if Paid (Core / AutoPilot), or copy to clipboard if Free
            if (hasOneClick) {
              await ExtensionMessagingService.switchTab(targetFile);
              await new Promise((r) => setTimeout(r, 150));
              await ExtensionMessagingService.insertCode({
                code: newCode,
                mode: 'replace',
                targetFile,
              });
              onNotify(`✓ Solved and replaced ${baseName} in editor!`, false);
            } else {
              await ClipboardManager.copyCode(newCode);
              onNotify(`✓ Solved ${baseName}! Copied to clipboard — paste into editor (Ctrl+V)`, false);
            }
            return;
          }
        }
      }

      const req: ProblemRequestDTO = {
        title: titleWithFile,
        problem_statement: statementWithContext,
        input_format: problemContext?.inputFormat,
        output_format: problemContext?.outputFormat,
        constraints: problemContext?.constraints,
        examples: problemContext?.sampleCases || [],
        selected_language: normalizeLanguage(targetLang),
        starter_code: starterCode,
        workspace_files: workspaceFiles,
        platform: problemContext?.platform?.toLowerCase() || 'codechef',
        problem_url: problemContext?.url,
      };

      const res = await SolutionService.generate(req, providerOverride, abortCtrl.signal);
      setSolutionResult(res);

      if (hasOneClick && res.code) {
        await ExtensionMessagingService.insertCode({
          code: res.code,
          mode: 'replace',
          targetFile: activeFileName || undefined,
        });
        onNotify(
          activeFileName
            ? `✓ Optimal solution generated & replaced in ${activeFileName}!`
            : `✓ Optimal ${selectedLanguage} solution generated & replaced in editor!`
        );
      } else {
        if (res.code) {
          await ClipboardManager.copyCode(res.code);
        }
        onNotify(
          activeFileName
            ? `✓ Optimal solution generated for ${activeFileName}! Copied to clipboard (Ctrl+V)`
            : `✓ Optimal ${selectedLanguage} solution generated! Copied to clipboard (Ctrl+V)`
        );
      }
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
      {/* Segmented Mode Selector */}
      <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-colors cursor-pointer text-center ${
            activeTab === 'generate'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Generate solution
        </button>
        <button
          onClick={() => {
            setActiveTab('optimize');
            if (!studentCode) handleFetchFromEditor();
          }}
          className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-colors cursor-pointer text-center ${
            activeTab === 'optimize'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Optimize code
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

          {/* Multi-File Architecture Session History Card */}
          {multiFileSession && Array.isArray(multiFileSession.files) && multiFileSession.files.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-900/95 border border-indigo-500/30 flex flex-col gap-2.5 text-xs shadow-lg shadow-indigo-950/25 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[170px]" title={multiFileSession.problem_title}>
                    {multiFileSession.problem_title || 'Multi-File Architecture'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                    {multiFileSession.files.filter((f: any) => f.status === 'completed').length}/{multiFileSession.files.length} Done
                  </span>
                  <button
                    onClick={handleClearSession}
                    className="text-slate-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    title="Clear session history"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* File Rows with Per-File Sync & Regenerate */}
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {multiFileSession.files.map((file: any, idx: number) => {
                  const baseName = (file.filename || '').split('/').pop() || file.filename;
                  const isDone = file.status === 'completed';
                  const isBusy = regeneratingFile === file.filename;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] group"
                    >
                      <div
                        onClick={() => file.code && handleSyncFileToEditor(file.filename, file.code)}
                        className={`flex items-center gap-1.5 min-w-0 pr-1 ${file.code ? 'cursor-pointer hover:opacity-85' : ''}`}
                        title={file.code ? `Click to view or insert ${baseName} into editor` : file.filename}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isBusy ? (
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                        ) : (
                          <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="font-mono text-slate-200 truncate group-hover:text-indigo-300 transition-colors" title={file.filename}>
                          {baseName}
                        </span>
                        {file.role && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-sans">
                            {file.role}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.code && (
                          <button
                            onClick={() => handleSyncFileToEditor(file.filename, file.code)}
                            className="px-2 py-0.5 rounded bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                            title={`Sync & replace ${baseName} in active editor`}
                          >
                            Sync
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerateFile(file.filename)}
                          disabled={isBusy}
                          className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-50"
                          title="Regenerate this specific file using session memory"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          {loadingGenerate ? (
            <div className="flex items-center gap-2 w-full">
              <button
                disabled
                className="flex-1 py-2 px-3 rounded-lg font-medium text-xs text-white bg-slate-800 border border-slate-700 flex items-center justify-center gap-2 cursor-wait"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Generating solution...</span>
              </button>
              <button
                onClick={handleStopGenerate}
                className="py-2 px-3 rounded-lg font-medium text-xs text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Stop"
              >
                <Square className="w-3 h-3 fill-current text-rose-400" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              className="w-full py-2 px-3 rounded-lg font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{solutionResult ? 'Regenerate solution' : 'Generate solution'}</span>
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
            emptyMessage={`Click "Generate Solution" above to write an optimal ${selectedLanguage} solution.`}
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
    </div>
  );
};

export default AIActions;
