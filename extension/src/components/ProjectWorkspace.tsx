import React, { useState, useEffect, useRef } from 'react';
import {
  FolderGit2,
  Upload,
  Layers,
  FileCode,
  GitPullRequest,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  ProjectService,
  ProjectDTO,
  ProjectFileDTO,
  ProjectArchitectureDTO,
  PlanResponseDTO,
  PatchResponseDTO,
  DiagnoseResponseDTO,
} from '../services/project-service';

interface ProjectWorkspaceProps {
  onNotify: (msg: string, isError?: boolean) => void;
  userTier?: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ onNotify, userTier = 'free' }) => {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'files' | 'architecture' | 'planner' | 'diagnose'>('files');

  // Files Tab
  const [files, setFiles] = useState<ProjectFileDTO[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFileDTO | null>(null);
  const [fileSearch, setFileSearch] = useState<string>('');

  // Architecture Tab
  const [architecture, setArchitecture] = useState<ProjectArchitectureDTO | null>(null);

  // Planner Tab
  const [taskPrompt, setTaskPrompt] = useState<string>('');
  const [planning, setPlanning] = useState<boolean>(false);
  const [planResult, setPlanResult] = useState<PlanResponseDTO | null>(null);
  const [patching, setPatching] = useState<boolean>(false);
  const [activePatch, setActivePatch] = useState<PatchResponseDTO | null>(null);
  const [patchApplied, setPatchApplied] = useState<boolean>(false);

  // Diagnose Tab
  const [errorInput, setErrorInput] = useState<string>('');
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResponseDTO | null>(null);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // When active project changes, reload active tab data
  useEffect(() => {
    if (activeProject) {
      loadFiles(activeProject.id);
      loadArchitecture(activeProject.id);
      setPlanResult(null);
      setActivePatch(null);
      setPatchApplied(false);
      setDiagnoseResult(null);
    } else {
      setFiles([]);
      setSelectedFile(null);
      setArchitecture(null);
    }
  }, [activeProject]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const list = await ProjectService.listProjects();
      setProjects(list);
      if (list.length > 0 && !activeProject) {
        setActiveProject(list[0]);
      }
    } catch (err: any) {
      onNotify(err.message || 'Failed to load projects', true);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (projId: string) => {
    try {
      const tree = await ProjectService.getFileTree(projId);
      setFiles(tree);
      if (tree.length > 0) setSelectedFile(tree[0]);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadArchitecture = async (projId: string) => {
    try {
      const arch = await ProjectService.getArchitecture(projId);
      setArchitecture(arch);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      onNotify('Extracting, scanning for secrets, and indexing project...');
      const created = await ProjectService.importZip(file);
      onNotify(`Project '${created.name}' imported and indexed successfully!`);
      await loadProjects();
      setActiveProject(created);
    } catch (err: any) {
      onNotify(err.message || 'Import failed', true);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!confirm(`Delete project '${activeProject.name}'?`)) return;

    try {
      setLoading(true);
      await ProjectService.deleteProject(activeProject.id);
      onNotify(`Project '${activeProject.name}' deleted`);
      setActiveProject(null);
      await loadProjects();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete project', true);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanTask = async () => {
    if (!activeProject || !taskPrompt.trim()) return;
    try {
      setPlanning(true);
      const plan = await ProjectService.planTask(activeProject.id, taskPrompt);
      setPlanResult(plan);
      onNotify(`Generated ${plan.steps.length}-step coordinated plan.`);
    } catch (err: any) {
      onNotify(err.message || 'Task planning failed', true);
    } finally {
      setPlanning(false);
    }
  };

  const handleGeneratePatches = async () => {
    if (!activeProject || !taskPrompt.trim()) return;
    try {
      setPatching(true);
      const patch = await ProjectService.generatePatches(activeProject.id, taskPrompt);
      setActivePatch(patch);
      setPatchApplied(false);
      onNotify(`Generated ${patch.files.length} coordinated patch diffs for review.`);
    } catch (err: any) {
      onNotify(err.message || 'Patch generation failed', true);
    } finally {
      setPatching(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!activeProject || !activePatch) return;
    try {
      setLoading(true);
      const res = await ProjectService.applyPatch(activeProject.id, activePatch.id);
      setPatchApplied(true);
      onNotify(`Successfully applied patch to ${res.applied_files_count} file(s)!`);
      loadFiles(activeProject.id);
    } catch (err: any) {
      onNotify(err.message || 'Failed to apply patch', true);
    } finally {
      setLoading(false);
    }
  };

  const handleRollbackPatch = async () => {
    if (!activeProject || !activePatch) return;
    try {
      setLoading(true);
      const res = await ProjectService.rollbackPatch(activeProject.id, activePatch.id);
      setPatchApplied(false);
      onNotify(`Reverted changes across ${res.reverted_files_count} file(s).`);
      loadFiles(activeProject.id);
    } catch (err: any) {
      onNotify(err.message || 'Rollback failed', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnose = async () => {
    if (!activeProject || !errorInput.trim()) return;
    try {
      setDiagnosing(true);
      const diag = await ProjectService.diagnoseError(activeProject.id, errorInput);
      setDiagnoseResult(diag);
      onNotify(`Identified ${diag.diagnostics.length} diagnostic error(s) and proposed fixes.`);
    } catch (err: any) {
      onNotify(err.message || 'Diagnosis failed', true);
    } finally {
      setDiagnosing(false);
    }
  };

  const maxAllowedFiles = userTier === 'pro' ? 50 : userTier === 'premium' ? 2000 : 3;
  const filteredFiles = files.filter((f) =>
    f.relative_path.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 text-slate-100">
      {/* Top Project Selector & Upload Bar */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white">Project Workspace</h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import ZIP</span>
            </button>
          </div>
        </div>

        {/* Project Selector or Empty State */}
        {projects.length > 0 ? (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 flex-1 focus:outline-none focus:border-indigo-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.framework} • {p.indexed_file_count} files)
                </option>
              ))}
            </select>

            <button
              onClick={handleDeleteProject}
              title="Delete Project"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
            <span>No project imported. Upload a ZIP archive to analyze multi-file structure.</span>
          </div>
        )}

        {/* Quota & Plan Status Banner */}
        {activeProject && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 uppercase font-mono text-[10px]">
                {activeProject.framework}
              </span>
              <span>•</span>
              <span>{activeProject.build_system}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Indexed:</span>
              <span className="text-slate-200 font-medium">
                {activeProject.indexed_file_count} / {maxAllowedFiles} files
              </span>
              {userTier === 'free' && activeProject.indexed_file_count >= 3 && (
                <span className="text-amber-400 text-[10px] ml-1">(Free Quota)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {activeProject && (
        <>
          {/* Inner Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Files ({files.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === 'planner'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Agent Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnose')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === 'diagnose'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Diagnose</span>
            </button>
          </div>

          {/* TAB 1: FILES & TREE */}
          {activeTab === 'files' && (
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      selectedFile?.id === file.id
                        ? 'bg-indigo-950/40 text-indigo-300'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{file.relative_path}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {file.is_test && (
                        <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800/40 rounded text-[10px]">
                          TEST
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">{file.line_count}L</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedFile && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-1.5">
                    <span className="font-mono text-slate-200">{selectedFile.file_name}</span>
                    <span className="text-[11px]">{selectedFile.byte_size} bytes</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto bg-slate-900/60 p-2 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {selectedFile.content || '// Content indexed securely.'}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARCHITECTURE & INTELLIGENCE */}
          {activeTab === 'architecture' && architecture && (
            <div className="flex flex-col gap-2.5">
              {/* Anti-Patterns Warning */}
              {architecture.anti_patterns.length > 0 && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex flex-col gap-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Architectural Anti-Patterns Detected</span>
                  </div>
                  {architecture.anti_patterns.map((ap, idx) => (
                    <div key={idx} className="text-[11px] pl-5 list-disc">
                      <span className="font-mono text-amber-300">{ap.class}</span>: {ap.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Endpoints List */}
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>API Endpoints</span>
                  <span className="text-[11px] text-slate-400">{architecture.endpoints.length} discovered</span>
                </h3>

                <div className="divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
                  {architecture.endpoints.map((ep, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            ep.method === 'GET'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : ep.method === 'POST'
                              ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="text-slate-200 truncate">{ep.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{ep.handler_method}()</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layers Overview */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Services</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{architecture.services.length} classes</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {architecture.services.map((s) => s.name).join(', ') || 'None'}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Entities & Models</span>
                  <div className="font-semibold text-slate-200 mt-0.5">{architecture.entities.length} classes</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {architecture.entities.map((e) => e.name).join(', ') || 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AGENT PLANNER & PATCHING */}
          {activeTab === 'planner' && (
            <div className="flex flex-col gap-2.5">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-200">
                  Coordinated Multi-File Task
                </label>
                <textarea
                  rows={2}
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="e.g. Add findByNameIgnoreCase to StudentService and update CollegeApp caller"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlanTask}
                    disabled={planning || !taskPrompt.trim()}
                    className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                  >
                    {planning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>1. Plan Changes</span>
                  </button>

                  <button
                    onClick={handleGeneratePatches}
                    disabled={patching || !taskPrompt.trim()}
                    className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-600/30"
                  >
                    {patching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>2. Generate Patches</span>
                  </button>
                </div>
              </div>

              {/* Plan Steps Output */}
              {planResult && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>Task Execution Plan</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Risk: {planResult.risk_assessment}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/60 max-h-36 overflow-y-auto">
                    {planResult.steps.map((step) => (
                      <div key={step.step_number} className="py-1.5 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {step.step_number}
                        </span>
                        <div className="flex flex-col">
                          <div className="font-mono text-slate-200 text-[11px]">{step.file_path}</div>
                          <div className="text-[11px] text-slate-400">{step.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patches Review & Apply / Rollback */}
              {activePatch && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <GitPullRequest className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-white">
                        Review Patches ({activePatch.files.length} files)
                      </span>
                    </div>

                    {!patchApplied ? (
                      <button
                        onClick={handleApplyPatch}
                        disabled={loading}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve & Apply</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleRollbackPatch}
                        disabled={loading}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>

                  {/* Diff Viewer */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activePatch.files.map((file, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono">
                        <div className="text-slate-300 font-semibold mb-1 pb-1 border-b border-slate-800/80">
                          {file.file_path}
                        </div>
                        <pre className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {file.diff_content.split('\n').map((line, lIdx) => (
                            <span
                              key={lIdx}
                              className={
                                line.startsWith('+') && !line.startsWith('+++')
                                  ? 'text-emerald-400 block bg-emerald-950/20'
                                  : line.startsWith('-') && !line.startsWith('---')
                                  ? 'text-rose-400 block bg-rose-950/20'
                                  : line.startsWith('@@')
                                  ? 'text-indigo-400 block'
                                  : 'block'
                              }
                            >
                              {line}
                            </span>
                          ))}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIAGNOSE & REPAIR */}
          {activeTab === 'diagnose' && (
            <div className="flex flex-col gap-2.5">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-200">
                  Paste Compiler / Maven / Test Output
                </label>
                <textarea
                  rows={3}
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                  placeholder="[ERROR] /src/main/java/.../StudentService.java:[25,12] error: cannot find symbol symbol: class Optional"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing || !errorInput.trim()}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {diagnosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  <span>Diagnose & Propose Fix</span>
                </button>
              </div>

              {diagnoseResult && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2.5 text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Diagnostics & Targeted Repair</span>
                  </div>

                  {diagnoseResult.diagnostics.map((diag, idx) => (
                    <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="flex items-center justify-between font-mono text-[11px] text-amber-300">
                        <span>{diag.file_path}:{diag.line_number}</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40 text-[10px]">
                          {diag.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{diag.error_message}</div>
                    </div>
                  ))}

                  {diagnoseResult.proposed_repairs.map((repair, idx) => (
                    <div key={idx} className="p-2 bg-slate-950 border border-emerald-800/40 rounded-lg flex flex-col gap-1.5">
                      <div className="text-[11px] font-semibold text-emerald-400">
                        {repair.explanation}
                      </div>
                      <pre className="text-[10px] font-mono text-slate-300 bg-slate-900 p-1.5 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {repair.diff_content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
