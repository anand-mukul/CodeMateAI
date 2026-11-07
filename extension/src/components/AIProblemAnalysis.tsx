import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Cpu, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { ProblemAnalysisDTO } from '../types/ai';

interface AIProblemAnalysisProps {
  analysis: ProblemAnalysisDTO;
}

export const AIProblemAnalysis: React.FC<AIProblemAnalysisProps> = ({ analysis }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    constraints: true,
    approaches: true,
    edgeCases: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Algorithmic Analysis</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {analysis.expected_time_complexity}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {analysis.expected_space_complexity}
          </span>
        </div>
      </div>

      {/* 1. Problem Overview Accordion */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 transition-colors text-left font-medium text-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Problem Overview</span>
          </div>
          {expandedSections.overview ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        {expandedSections.overview && (
          <div className="p-3 flex flex-col gap-2 text-[11px] text-slate-300 leading-relaxed">
            <div>
              <span className="text-slate-400 font-semibold">Summary: </span>
              {analysis.problem_summary}
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Objective: </span>
              {analysis.objective}
            </div>
            {analysis.input_description && (
              <div>
                <span className="text-slate-400 font-semibold">Input: </span>
                {analysis.input_description}
              </div>
            )}
            {analysis.output_description && (
              <div>
                <span className="text-slate-400 font-semibold">Output: </span>
                {analysis.output_description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Constraints & Complexity Budget */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <button
          onClick={() => toggleSection('constraints')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 transition-colors text-left font-medium text-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Constraints & Feasibility</span>
          </div>
          {expandedSections.constraints ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        {expandedSections.constraints && (
          <div className="p-3 flex flex-col gap-2 text-[11px] leading-relaxed text-slate-300">
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
              {analysis.constraints_analysis}
            </div>
            {analysis.important_observations && analysis.important_observations.length > 0 && (
              <div>
                <span className="text-slate-400 font-semibold">Key Observations:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                  {analysis.important_observations.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Potential Approaches & Recommended Algorithm */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <button
          onClick={() => toggleSection('approaches')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 transition-colors text-left font-medium text-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Algorithmic Approaches ({analysis.potential_approaches.length})</span>
          </div>
          {expandedSections.approaches ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        {expandedSections.approaches && (
          <div className="p-3 flex flex-col gap-2.5 text-[11px] leading-relaxed">
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
              <span className="font-semibold text-white">Recommended: </span>
              {analysis.recommended_algorithm}
              {analysis.recommended_data_structures.length > 0 && (
                <div className="mt-1 text-[10px] text-indigo-300">
                  Data Structures: {analysis.recommended_data_structures.join(', ')}
                </div>
              )}
            </div>

            <div className="space-y-2 mt-1">
              {analysis.potential_approaches.map((app, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">{app.name}</span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        app.feasibility.toLowerCase().includes('optimal')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {app.feasibility}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1.5">{app.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>Time: <strong className="text-slate-300">{app.time_complexity}</strong></span>
                    <span>•</span>
                    <span>Space: <strong className="text-slate-300">{app.space_complexity}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Edge Cases */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <button
          onClick={() => toggleSection('edgeCases')}
          className="w-full flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 transition-colors text-left font-medium text-slate-200"
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            <span>Boundary & Edge Cases ({analysis.edge_cases.length})</span>
          </div>
          {expandedSections.edgeCases ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        {expandedSections.edgeCases && (
          <div className="p-3 text-[11px] leading-relaxed text-slate-300">
            <ul className="list-disc list-inside space-y-1">
              {analysis.edge_cases.map((ec, i) => (
                <li key={i}>{ec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProblemAnalysis;
