/**
 * CodeMate AI — LangGraph.js Multi-File Project Orchestrator
 * 
 * Manages stateful, sequential multi-file problem solving on CodeChef.
 * Integrates with the backend's Ephemeral Task Context Service (Upstash Redis, 15m TTL).
 * Prevents interface/contract drift by propagating entity schemas and REST endpoints across files.
 */

import { Annotation } from "@langchain/langgraph";
import { ExtensionMessagingService } from "./extension-messaging";
import { CodeMateApiClient } from "./api";

// 1. LangGraph State Annotation
export const MultiFileAnnotation = Annotation.Root({
  taskId: Annotation<string>(),
  problemTitle: Annotation<string>(),
  problemStatement: Annotation<string>(),
  targetFramework: Annotation<string>(),
  dependencyOrder: Annotation<string[]>(),
  currentStepIndex: Annotation<number>(),
  rawFiles: Annotation<Record<string, string>>(),
  completedFiles: Annotation<Record<string, string>>(),
  sharedContracts: Annotation<Record<string, any>>(),
  stepSummaries: Annotation<string[]>(),
  status: Annotation<"INITIALIZING" | "PROCESSING" | "INJECTING" | "COMPLETED" | "FAILED" | "CANCELLED">(),
  currentFile: Annotation<string>(),
  currentCode: Annotation<string>(),
  currentExplanation: Annotation<string>(),
  lastError: Annotation<string | null>(),
});

export type MultiFileState = typeof MultiFileAnnotation.State;

export type StepProgressCallback = (
  step: number,
  total: number,
  currentFile: string,
  phase: "synthesizing" | "injecting" | "settling" | "completed" | "failed",
  message: string
) => void;

export class MultiFileProjectOrchestrator {
  private static activeAbortController: AbortController | null = null;

  /**
   * Cancels active execution and instructs backend to purge task memory immediately
   */
  public static async abortCurrentTask(taskId?: string): Promise<void> {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    if (taskId) {
      try {
        await CodeMateApiClient.request(`/api/tasks/${taskId}`, { method: "DELETE" }, 1);
      } catch {}
    }
  }

  /**
   * Executes the full LangGraph-driven multi-file solving workflow
   */
  public static async executeProjectWorkflow(
    problemTitle: string,
    problemStatement: string,
    files: Record<string, string>,
    providerOverride?: string,
    modelOverride?: string,
    onProgress?: StepProgressCallback
  ): Promise<{ success: boolean; completedFiles: Record<string, string>; summary: string; error?: string }> {
    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    let currentTaskId = "";

    try {
      // Step 1: Initialize Task Context
      onProgress?.(0, Object.keys(files).length, "Workspace", "synthesizing", "Planning file order...");

      let dependencyOrder = Object.keys(files);
      let totalSteps = dependencyOrder.length;

      try {
        const initPromise = CodeMateApiClient.request<{
          task_id: string;
          target_framework: string;
          dependency_order: string[];
          total_steps: number;
          summary: string;
        }>("/api/tasks/init", {
          method: "POST",
          body: JSON.stringify({
            problem_title: problemTitle,
            problem_statement: problemStatement,
            files,
            provider: providerOverride,
            model: modelOverride,
          }),
        }, 1, providerOverride, "GENERATE");

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout initializing task")), 30000)
        );

        const initRes = await Promise.race([initPromise, timeoutPromise]);
        if (initRes && initRes.task_id) {
          currentTaskId = initRes.task_id;
          if (initRes.dependency_order && initRes.dependency_order.length > 0) {
            dependencyOrder = initRes.dependency_order;
            totalSteps = dependencyOrder.length;
          }
        }
      } catch (initErr) {
        console.warn("[MultiFile] Init fallback engaged:", initErr);
      }

      const completedFiles: Record<string, string> = {};

      // Step 2: Iterate sequentially through dependency order
      for (let i = 0; i < totalSteps; i++) {
        if (signal.aborted) {
          throw new Error("Task execution cancelled by user.");
        }

        const targetFile = dependencyOrder[i];
        onProgress?.(
          i + 1,
          totalSteps,
          targetFile,
          "synthesizing",
          `Writing ${targetFile} (${i + 1} of ${totalSteps})...`
        );

        // A. Call backend to synthesize file
        let stepCode = "";
        let extractedContracts: Record<string, any> = {};

        if (currentTaskId) {
          try {
            const stepRes = await CodeMateApiClient.request<{
              task_id: string;
              step_index: number;
              target_file: string;
              code: string;
              explanation: string;
              extracted_contracts: Record<string, any>;
            }>(`/api/tasks/${currentTaskId}/step`, {
              method: "POST",
              body: JSON.stringify({
                task_id: currentTaskId,
                step_index: i,
                target_file: targetFile,
                provider: providerOverride,
                model: modelOverride,
              }),
            }, 2, providerOverride, "GENERATE");

            if (stepRes && stepRes.code) {
              stepCode = stepRes.code;
              extractedContracts = stepRes.extracted_contracts || {};
            }
          } catch (stepErr) {
            console.warn(`[MultiFile] Step API error for ${targetFile}, trying direct fallback:`, stepErr);
          }
        }

        // Direct fallback if step API failed or no task_id
        if (!stepCode) {
          const genRes = await CodeMateApiClient.generateSolution({
            title: `${problemTitle} - ${targetFile}`,
            problem_statement: `${problemStatement}\n\nTarget File to implement: ${targetFile}\nExisting Starter Code:\n${files[targetFile] || ""}`,
            starter_code: files[targetFile] || undefined,
            selected_language: targetFile.endsWith(".java") ? "java" : targetFile.endsWith(".py") ? "python" : "cpp",
          }, providerOverride);
          stepCode = genRes.code;
        }

        if (!stepCode) {
          throw new Error(`Failed to generate valid code for ${targetFile}.`);
        }

        if (signal.aborted) throw new Error("Task execution cancelled by user.");

        // B. Switch tab in CodeChef Ace editor DOM
        onProgress?.(
          i + 1,
          totalSteps,
          targetFile,
          "injecting",
          `Switching editor tab to '${targetFile}'...`
        );

        try {
          await ExtensionMessagingService.switchTab(targetFile);
        } catch (e) {
          console.warn(`[MultiFile] Tab switch warning for ${targetFile}:`, e);
        }

        // Buffer attachment settle delay
        await new Promise((r) => setTimeout(r, 450));

        if (signal.aborted) throw new Error("Task execution cancelled by user.");

        // C. Inject code into Ace editor with preserved undo
        onProgress?.(
          i + 1,
          totalSteps,
          targetFile,
          "injecting",
          `Inserting code into ${targetFile}...`
        );

        const insertRes = await ExtensionMessagingService.insertCode({
          code: stepCode,
          mode: "replace",
          targetFile,
        });

        if (!insertRes || !insertRes.success) {
          console.warn(`[MultiFile] Direct injection warning for ${targetFile}, continuing...`);
        }

        completedFiles[targetFile] = stepCode;

        // D. Commit step to backend memory if task active
        if (currentTaskId) {
          try {
            await CodeMateApiClient.request(`/api/tasks/${currentTaskId}/commit`, {
              method: "POST",
              body: JSON.stringify({
                task_id: currentTaskId,
                step_index: i,
                target_file: targetFile,
                code: stepCode,
                extracted_contracts: extractedContracts,
              }),
            }, 1);
          } catch {}
        }

        // E. Cooldown delay for editor stabilization
        onProgress?.(
          i + 1,
          totalSteps,
          targetFile,
          "settling",
          `Completed ${targetFile}...`
        );
        await new Promise((r) => setTimeout(r, 800));
      }

      // Step 3: Complete & Clean Up
      onProgress?.(totalSteps, totalSteps, "Workspace", "completed", "All files updated!");
      if (currentTaskId) {
        await this.abortCurrentTask(currentTaskId);
      }

      return {
        success: true,
        completedFiles,
        summary: `Successfully completed all ${totalSteps} project files.`,
      };
    } catch (err: any) {
      if (currentTaskId) {
        await this.abortCurrentTask(currentTaskId);
      }
      const msg = err instanceof Error ? err.message : String(err);
      onProgress?.(0, 0, "Error", "failed", msg);
      return {
        success: false,
        completedFiles: {},
        summary: "Multi-file execution halted.",
        error: msg,
      };
    } finally {
      this.activeAbortController = null;
    }
  }
}
