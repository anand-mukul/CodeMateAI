import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Clock,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { ReliabilityEngine, ReliabilityMetrics } from '../services/reliability-engine';

export const ReliabilityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ReliabilityMetrics>(ReliabilityEngine.getMetrics());
  const [activeWorkflowInfo, setActiveWorkflowInfo] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = ReliabilityEngine.subscribe((updated) => {
      setMetrics(updated);
    });

    ReliabilityEngine.getSavedWorkflow().then((w) => {
      if (w) {
        setActiveWorkflowInfo(`${w.problemTitle} (${w.stage}) - ${new Date(w.timestamp).toLocaleTimeString()}`);
      } else {
        setActiveWorkflowInfo(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleClearSavedWorkflow = async () => {
    await ReliabilityEngine.clearSavedWorkflow();
    setActiveWorkflowInfo(null);
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-100 text-xs">Reliability & Scheduler Telemetry</span>
        </div>
        <span
          className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
            metrics.backendOnline
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
              : 'bg-red-950 text-red-300 border border-red-800/60'
          }`}
        >
          {metrics.backendOnline ? '🟢 Engine Active' : '🔴 Standby'}
        </span>
      </div>

      {/* Core Telemetry Metric Cards */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Metric 1: Request Latency */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Last Latency</span>
            </span>
            <span className="font-mono text-indigo-300 font-bold">
              {metrics.lastLatencyMs ? `${metrics.lastLatencyMs}ms` : '--'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Round-trip execution time</span>
        </div>

        {/* Metric 2: Concurrency & Queue */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>In-Flight Tasks</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">
              {metrics.inFlightRequests} / 1
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Scheduler concurrency lock</span>
        </div>

        {/* Metric 3: Total Requests & Retries */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
              <span>Adaptive Retries</span>
            </span>
            <span className="font-mono text-purple-300 font-bold">
              {metrics.totalRetries}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {metrics.totalRequests} total requests handled
          </span>
        </div>

        {/* Metric 4: Cooldown & Rate Limits */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cooldown</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">
              {metrics.cooldownRemainingSeconds > 0
                ? `${metrics.cooldownRemainingSeconds}s`
                : 'Ready'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {metrics.rateLimitHits} rate-limit 429 catches
          </span>
        </div>
      </div>

      {/* Active Long-Running Workflow Snapshot */}
      <div className="p-2 rounded-lg bg-slate-850 border border-slate-800 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Persisted MV3 Workflow State:</span>
          </span>
          {activeWorkflowInfo && (
            <button
              onClick={handleClearSavedWorkflow}
              className="text-[10px] text-red-400 hover:text-red-300 underline"
            >
              Clear State
            </button>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-400">
          {activeWorkflowInfo || 'No background workflow suspended in storage.'}
        </p>
      </div>

      {/* Sanitized Recent Errors Log */}
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Recent Reliability Events & Sanitized Errors:</span>
        </span>
        <div className="max-h-28 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-850 flex flex-col gap-1 text-[10px] font-mono">
          {metrics.recentErrors.length === 0 ? (
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>All operations normal. 0 recent errors.</span>
            </span>
          ) : (
            metrics.recentErrors.map((err, idx) => (
              <div key={idx} className="border-b border-slate-850 pb-1 text-slate-300">
                <div className="flex items-center justify-between text-slate-500 text-[9px]">
                  <span>{err.endpoint || 'General'}</span>
                  <span>{new Date(err.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-red-400 mt-0.5">{err.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
