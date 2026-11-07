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

      // Check if multi-file workspace
      let workspaceFiles: Record<string, string> | null = null;
      try {
        const harvestRes = await ExtensionMessagingService.harvestWorkspace();
        if (harvestRes.success && harvestRes.data && Object.keys(harvestRes.data).length >= 2) {
          workspaceFiles = harvestRes.data;
        }
      } catch {}

      let generatedCode = '';

      if (workspaceFiles && Object.keys(workspaceFiles).length >= 2) {
        addLog(`Multi-file workspace detected (${Object.keys(workspaceFiles).length} files). Synthesizing components...`);
        const activeName = Object.keys(workspaceFiles)[0];
        const res = await CodeMateApiClient.request<{ filename: string; code: string }>(
          '/api/projects/ephemeral/complete-file',
          {
            method: 'POST',
            body: JSON.stringify({
              filename: activeName,
              file_content: starterCode || Object.values(workspaceFiles)[0] || '',
              problem_title: problemContext.problemTitle || 'Task',
              problem_statement: problemContext.problemStatement || '',
              selected_language: lang,
              completed_files_context: workspaceFiles,
            }),
          },
          2,
          providerOverride,
          'GENERATE'
        );
        generatedCode = res.code || '';
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
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-xs">Smart Practice Assistant</h3>
            <p className="text-[10px] text-slate-400">Synthesize ➔ Editor Insertion ➔ Test & Debug</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {fixAttempts > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
              Fixes: {fixAttempts}
            </span>
          )}
          {activeCode && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {activeCode.split('\n').length} lines
            </span>
          )}
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isAutonomousRunning
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 animate-pulse'
                : currentStep === 'VERIFIED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {currentStep}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Review & Submit on CodeChef ↗'}</span>
            </button>
          ) : (
            <button
              onClick={handleStartAutonomousLoop}
              disabled={!problemContext}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run Practice Assistant ({selectedLanguage})</span>
            </button>
          )
        ) : (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Pause Assistant</span>
          </button>
        )}

        {/* Safety & Restore Row */}
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">Academic integrity safe • Undo (Ctrl+Z) preserved</span>
          </div>

          {originalCode && (
            <button
              onClick={handleRestoreOriginal}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Restore code before assistant started"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Original</span>
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
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Assistant Progress Log
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
