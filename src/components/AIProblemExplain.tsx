import React from 'react';
import { Lightbulb, CheckCircle, AlertCircle, Compass } from 'lucide-react';
import { ProblemExplanationDTO } from '../types/ai';

interface AIProblemExplainProps {
  explanation: ProblemExplanationDTO;
}

export const AIProblemExplain: React.FC<AIProblemExplainProps> = ({ explanation }) => {
  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-slate-100">{explanation.problem_title}</div>
          <div className="text-[10px] text-slate-400">Student-Friendly Problem Breakdown</div>
        </div>
      </div>

      {/* 1. Simple Summary / Analogy */}
      <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-100 flex flex-col gap-1.5 leading-relaxed text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
          <Compass className="w-3.5 h-3.5" />
          <span>In Simple Terms:</span>
        </div>
        <p>{explanation.simple_summary}</p>
      </div>

      {/* 2. What is Asked */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-1 leading-relaxed text-[11px]">
        <span className="font-semibold text-slate-300">What is Expected of You:</span>
        <p className="text-slate-300">{explanation.what_is_asked}</p>
      </div>

      {/* 3. Input & Output Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col gap-1">
          <span className="font-semibold text-slate-400">Input Data:</span>
          <p className="text-slate-300 leading-relaxed">{explanation.input_breakdown}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-col gap-1">
          <span className="font-semibold text-slate-400">Output Result:</span>
          <p className="text-slate-300 leading-relaxed">{explanation.output_breakdown}</p>
        </div>
      </div>

      {/* 4. Example Step-by-Step Walkthrough */}
      {explanation.example_walkthrough && explanation.example_walkthrough.length > 0 && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="font-semibold text-slate-200">Step-by-Step Example Walkthrough:</span>
          <div className="space-y-1.5">
            {explanation.example_walkthrough.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Key Intuition & Common Traps */}
      <div className="grid grid-cols-1 gap-2 text-[11px]">
        {explanation.key_observations && explanation.key_observations.length > 0 && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <div className="flex items-center gap-1 font-semibold text-emerald-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Key Intuitions to Spot:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-200/90">
              {explanation.key_observations.map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>
        )}

        {explanation.edge_cases_to_consider && explanation.edge_cases_to_consider.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-1 font-semibold text-amber-400 mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Watch Out For These Traps:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90">
              {explanation.edge_cases_to_consider.map((trap, i) => (
                <li key={i}>{trap}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProblemExplain;
