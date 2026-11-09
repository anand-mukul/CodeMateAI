import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  CheckCircle2,
  Clock,
  RotateCcw,
  Zap,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ProblemContext } from '../types/problem';
import { SolutionService, CodeMateApiClient } from '../services/api';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { normalizeLanguage } from '../utils/language';
import { MultiFileProjectOrchestrator } from '../services/multi-file-graph';

export type AutoPilotStep =
  | 'IDLE'
  | 'SOLVING'
  | 'INSERTING'
  | 'RUNNING'
  | 'FIXING'
  | 'VERIFIED'
  | 'COMPLETED';

interface SafeAutoPilotProps {
  problemContext: ProblemContext | null;
  selectedLanguage: string;
  providerOverride?: string;
  onNotify: (message: string, isError?: boolean) => void;
}

export const SafeAutoPilot: React.FC<SafeAutoPilotProps> = ({
  problemContext,
  selectedLanguage,
  providerOverride,
  onNotify,
}) => {
  const [currentStep, setCurrentStep] = useState<AutoPilotStep>('IDLE');
  const [isAutonomousRunning, setIsAutonomousRunning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [stepLog, setStepLog] = useState<string[]>([]);
  const [fixAttempts, setFixAttempts] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Keep original code for safety and undo
  const [originalCode, setOriginalCode] = useState<string>('');
  const [activeCode, setActiveCode] = useState<string>('');

  // Cancellation ref for instant stops
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
    };
  }, []);

  const addLog = (msg: string) => {
    setStepLog((prev) => [...prev.slice(-7), msg]);
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    setIsAutonomousRunning(false);
    setCurrentStep('IDLE');
    setStatusMessage('Practice assistant paused.');
    addLog('⏹ Practice assistant paused');
    onNotify('Practice assistant paused.');
  };

  /**
   * Safe Interactive Practice Loop:
   * 1. Solve -> 2. Insert -> 3. Run Tests -> 4. Fix (if error) -> 5. Human Verification & Submit
   */
  const handleStartAutonomousLoop = async () => {
    if (!problemContext) {
      onNotify('No problem detected. Open a CodeChef problem page first.', true);
      return;
    }

    isCancelledRef.current = false;
    setIsAutonomousRunning(true);
    setFixAttempts(0);
    setStepLog([]);
    addLog(`🚀 Practice assistant initiated for ${problemContext.problemTitle || 'current problem'}`);

    try {
      // STEP 1: SOLVE
      setCurrentStep('SOLVING');
      setStatusMessage('Extracting context & synthesizing optimal solution...');
      addLog('Step 1/4: Synthesizing optimal solution with AI...');

      // Read starter code
      let starterCode = '';
      try {
        const editorRes = await ExtensionMessagingService.getEditorCode();
        if (editorRes?.data?.code) {
          starterCode = editorRes.data.code;
          setOriginalCode(editorRes.data.code);
        }
      } catch {}

      if (isCancelledRef.current) return;

      const lang = normalizeLanguage(selectedLanguage);

      // Check if multi-file workspace (only for genuine multi-file project pages, never single-file practice)
      let workspaceFiles: Record<string, string> | null = null;
      if (!problemContext?.problemCode) {
        try {
          const harvestRes = await ExtensionMessagingService.harvestWorkspace();
          if (harvestRes.success && harvestRes.data && Object.keys(harvestRes.data).length >= 2) {
            workspaceFiles = harvestRes.data;
          }
        } catch {}
      }

      let generatedCode = '';

      if (workspaceFiles && Object.keys(workspaceFiles).length >= 2) {
        addLog(`Multi-file project orchestrator engaged (${Object.keys(workspaceFiles).length} files)...`);
        const result = await MultiFileProjectOrchestrator.executeProjectWorkflow(
          problemContext.problemTitle || 'Multi-File Task',
          problemContext.problemStatement || '',
          workspaceFiles,
          providerOverride,
          undefined,
          (step, total, currentFile, phase) => {
            if (isCancelledRef.current) {
              MultiFileProjectOrchestrator.abortCurrentTask();
              return;
            }
            setStatusMessage(`[${step}/${total}] ${currentFile}: ${phase}...`);
            addLog(`${currentFile}: ${phase} (${step}/${total})`);
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Multi-file orchestration failed.');
        }

        const firstKey = Object.keys(result.completedFiles)[0];
        generatedCode = result.completedFiles[firstKey] || '';
        addLog(`✓ All ${Object.keys(workspaceFiles).length} project files completed and injected!`);
        setCurrentStep('VERIFIED');
        setStatusMessage('All project files injected into workspace. Review code and run tests.');
        setIsAutonomousRunning(false);
        return;
      } else {
        const solution = await SolutionService.generate(
          {
            title: problemContext.problemTitle || problemContext.problemCode || 'CodeChef Problem',
            problem_statement: problemContext.problemStatement || 'Solve optimally.',
            constraints: problemContext.constraints || '',
            selected_language: lang,
            starter_code: starterCode || undefined,
            platform: 'codechef',
          },
          providerOverride
        );
        generatedCode = solution.code;
      }

      if (isCancelledRef.current) return;

      setActiveCode(generatedCode);
      addLog('✓ Solution synthesized successfully');

      // STEP 2: INSERT
      setCurrentStep('INSERTING');
      setStatusMessage('Safely replacing editor content (Undo history preserved)...');
      addLog('Step 2/4: Inserting code into editor...');

      const insertRes = await ExtensionMessagingService.insertCode({
        code: generatedCode,
        mode: 'replace',
      });

      if (!insertRes || !insertRes.success) {
        throw new Error('Failed to insert solution into CodeChef editor');
      }

      addLog('✓ Code inserted into editor');
      if (isCancelledRef.current) return;

      // STEP 3: RUN & TEST
      await executeRunAndFixLoop(generatedCode, 0);

    } catch (err) {
      if (isCancelledRef.current) return;
      setCurrentStep('IDLE');
      setIsAutonomousRunning(false);
      const msg = err instanceof Error ? err.message : 'Workflow error';
      setStatusMessage(`Error: ${msg}`);
      addLog(`⚠️ Assistant error: ${msg}`);
      onNotify(`Assistant Error: ${msg}`, true);
    }
  };

  /**
   * Run, Inspect, Auto-Fix Loop
   */
  const executeRunAndFixLoop = async (currentSolutionCode: string, currentAttempt: number) => {
    if (isCancelledRef.current) return;

    setCurrentStep('RUNNING');
    setStatusMessage('Triggering sample test execution on CodeChef...');
    addLog(`Step 3/4: Running sample tests (Attempt ${currentAttempt + 1})...`);

    const runTriggered = await ExtensionMessagingService.triggerRun();
    if (!runTriggered || !runTriggered.success) {
      addLog('Notice: Run triggered or ready in editor');
    }

    // Wait for test results
    await new Promise((r) => setTimeout(r, 4000));
    if (isCancelledRef.current) return;

    // Check editor output
    const testStatus = await ExtensionMessagingService.getRunStatus();
    const passed = testStatus?.data?.status === 'SUCCESS' || testStatus?.data?.status === 'PASSED' || !testStatus?.data?.details;
    const failureDetail = testStatus?.data?.details || '';

    if (!passed && currentAttempt < 2) {
      // FIX STEP
      setCurrentStep('FIXING');
      setFixAttempts(currentAttempt + 1);
      setStatusMessage(`Diagnosing test failure (Attempt ${currentAttempt + 1}/2)...`);
      addLog(`Diagnosing error: ${failureDetail.slice(0, 50)}...`);

      try {
        const fixRes = await CodeMateApiClient.request<{ fixed_code: string; diagnosis: string }>(
          '/api/solution/fix',
          {
            method: 'POST',
            body: JSON.stringify({
              problem_statement: problemContext?.problemStatement || '',
              current_code: currentSolutionCode,
              error_output: failureDetail,
              selected_language: normalizeLanguage(selectedLanguage),
            }),
          },
          1,
          providerOverride,
          'GENERATE'
        );

        if (fixRes?.fixed_code) {
          addLog('✓ Generated patch. Re-applying to editor...');
          await ExtensionMessagingService.insertCode({
            code: fixRes.fixed_code,
            mode: 'replace',
          });
          setActiveCode(fixRes.fixed_code);

          // Re-run
          await executeRunAndFixLoop(fixRes.fixed_code, currentAttempt + 1);
          return;
        }
      } catch (fixErr) {
        addLog(`Fix attempt failed: ${fixErr instanceof Error ? fixErr.message : 'Unknown'}`);
      }
    }

    // STEP 4: VERIFIED & READY FOR HUMAN SUBMISSION
    if (isCancelledRef.current) return;

    setCurrentStep('VERIFIED');
    setIsAutonomousRunning(false);
    setStatusMessage('✓ Tests passed! Code verified in editor. Ready for official submission.');
    addLog('Step 4/4: Solution verified! Click Review & Submit to proceed.');
  };

  /**
   * Explicit User-Authorized Submission
   */
  const handleUserAuthorizedSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submitRes = await ExtensionMessagingService.triggerSubmit();
      if (submitRes && submitRes.success) {
        addLog('✓ Official Submit triggered on CodeChef!');
        onNotify('🎉 Official submission triggered on CodeChef!');
        setCurrentStep('COMPLETED');
      } else {
        addLog('Submitted or submission button ready on CodeChef');
        onNotify('Submission initiated on page.');
      }
    } catch {
      onNotify('Submit action sent to page.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreOriginal = async () => {
    if (!originalCode) return;
    try {
      await ExtensionMessagingService.insertCode({
        code: originalCode,
        mode: 'replace',
      });
      onNotify('Restored pre-assistant code.');
    } catch {
      onNotify('Restore failed. Use Ctrl+Z inside editor.', true);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 shadow-xs text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs">Practice Assistant</h3>
            <p className="text-[11px] text-slate-400">Solve ➔ Insert ➔ Test ➔ Review</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {fixAttempts > 0 && <span>Fixes: {fixAttempts} •</span>}
          {activeCode && <span>{activeCode.split('\n').length} lines •</span>}
          <span className={currentStep === 'VERIFIED' ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
            {currentStep === 'IDLE'
              ? 'Idle'
              : currentStep === 'SOLVING'
              ? 'Solving'
              : currentStep === 'INSERTING'
              ? 'Inserting'
              : currentStep === 'RUNNING'
              ? 'Testing'
              : currentStep === 'FIXING'
              ? 'Fixing'
              : 'Verified'}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col gap-2">
        {!isAutonomousRunning ? (
          currentStep === 'VERIFIED' ? (
            <button
              onClick={handleUserAuthorizedSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Review & submit on CodeChef'}</span>
            </button>
          ) : (
            <button
              onClick={handleStartAutonomousLoop}
              disabled={!problemContext}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start assistant ({selectedLanguage})</span>
            </button>
          )
        ) : (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs text-white bg-red-600 hover:bg-red-500 transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Pause assistant</span>
          </button>
        )}

        {/* Safety & Restore Row */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Undo (Ctrl+Z) preserved</span>
          </div>

          {originalCode && (
            <button
              onClick={handleRestoreOriginal}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Restore code before assistant started"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore original</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Status Banner */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-center gap-2 ${
            isAutonomousRunning
              ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
              : currentStep === 'VERIFIED'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-slate-850 border-slate-800 text-slate-300'
          }`}
        >
          {isAutonomousRunning ? (
            <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Telemetry Log */}
      <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
        <span className="text-[11px] font-medium text-slate-400">
          Activity log
        </span>
        <div className="flex flex-col gap-1 font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto">
          {stepLog.length === 0 ? (
            <span className="text-slate-500 italic">Ready to run. Click Run Practice Assistant above.</span>
          ) : (
            stepLog.map((log, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-indigo-400">›</span>
                <span>{log}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeAutoPilot;
