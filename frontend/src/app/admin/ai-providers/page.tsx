"use client";

import * as React from "react";
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Check,
  Activity,
  AlertTriangle,
  Play,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminApi,
  AIProviderStatusResponse,
  AIProviderInfo,
} from "@/lib/api";
import { toast } from "sonner";

export default function AdminAIProvidersPage() {
  const [data, setData] = React.useState<AIProviderStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState<string | null>(null);
  const [selectedModels, setSelectedModels] = React.useState<Record<string, string>>({});
  const [testResults, setTestResults] = React.useState<
    Record<string, { available: boolean; latency_ms?: number; error?: string }>
  >({});

  const fetchProviders = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await adminApi.getAIProviderStatus();
      setData(res);

      // Pre-populate model selections
      const initialModels: Record<string, string> = {};
      res.available_providers.forEach((p) => {
        initialModels[p.id] = p.id === res.active_provider ? res.active_model : p.default_model;
      });
      setSelectedModels(initialModels);
    } catch (err) {
      console.error("Failed to load AI providers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSwitch = async (providerId: string) => {
    try {
      setSwitching(providerId);
      const targetModel = selectedModels[providerId];
      const updated = await adminApi.updateAIProvider(providerId, targetModel);
      setData(updated);
      toast.success(`Active AI provider changed to ${providerId.toUpperCase()} (${updated.active_model})`);
    } catch (err: any) {
      toast.error(err.message || `Failed to switch to ${providerId}`);
    } finally {
      setSwitching(null);
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTesting(providerId);
      const targetModel = selectedModels[providerId];
      const result = await adminApi.testAIProvider(providerId, targetModel);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          available: result.available,
          latency_ms: result.latency_ms,
          error: result.error,
        },
      }));
      if (result.available) {
        toast.success(`${providerId.toUpperCase()} probe passed in ${result.latency_ms ?? 0}ms!`);
      } else {
        toast.error(`${providerId.toUpperCase()} probe failed: ${result.error || "Timeout"}`);
      }
    } catch (err: any) {
      toast.error(err.message || `Test failed for ${providerId}`);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI Engines & Dynamic Routing"
        description="Switch primary AI reasoning provider at runtime without downtime. Changes persist across application restarts."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "AI Routing" }]}
        badge="Zero Downtime Switching"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        }
      />

      {/* Active Routing Banner */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block">
                Live Production Engine
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold font-mono uppercase text-foreground">
                  {data?.active_provider || "DEEPSEEK"}
                </span>
                <span className="text-sm font-mono text-muted-foreground">•</span>
                <span className="text-sm font-mono text-primary font-semibold">
                  {data?.active_model || "deepseek-flash"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-500 border border-emerald-500/20">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Routing Active
            </span>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {data?.available_providers?.map((provider) => {
          const isActive = provider.id === data.active_provider;
          const test = testResults[provider.id];
          const isTesting = testing === provider.id;
          const isSwitching = switching === provider.id;
          const currentModel = selectedModels[provider.id] || provider.default_model;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border bg-card p-6 flex flex-col justify-between shadow-2xs transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary/40 bg-card"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
                  </div>
                  {isActive ? (
                    <Badge variant="default" className="font-mono text-[10px] gap-1">
                      <Check className="size-3" /> ACTIVE
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      STANDBY
                    </Badge>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Credentials:</span>
                  {provider.configured ? (
                    <span className="inline-flex items-center gap-1 text-emerald-500 font-mono text-[11px]">
                      <CheckCircle2 className="size-3" /> Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-500 font-mono text-[11px]">
                      <XCircle className="size-3" /> Missing Key
                    </span>
                  )}
                </div>

                {/* Model Selector */}
                <div className="mt-4 space-y-1.5">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase block">
                    Reasoning Model
                  </label>
                  <select
                    value={currentModel}
                    onChange={(e) =>
                      setSelectedModels((prev) => ({
                        ...prev,
                        [provider.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-hidden"
                  >
                    {provider.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Probe Diagnostics */}
                {test && (
                  <div className="mt-4 rounded-lg bg-muted/40 p-2.5 text-xs font-mono border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response Latency:</span>
                      <span className={test.available ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                        {test.available ? `${test.latency_ms}ms` : "Error"}
                      </span>
                    </div>
                    {test.error && (
                      <p className="mt-1 text-[10px] text-rose-500 line-clamp-2">{test.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(provider.id)}
                  disabled={isTesting || !provider.configured}
                  className="flex-1 h-8 text-xs gap-1.5"
                >
                  <Play className={`size-3 ${isTesting ? "animate-spin" : ""}`} />
                  <span>{isTesting ? "Pinging..." : "Test Ping"}</span>
                </Button>

                {!isActive && (
                  <Button
                    size="sm"
                    onClick={() => handleSwitch(provider.id)}
                    disabled={isSwitching || !provider.configured}
                    className="flex-1 h-8 text-xs gap-1.5"
                  >
                    <Zap className="size-3" />
                    <span>{isSwitching ? "Switching..." : "Set as Default"}</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

