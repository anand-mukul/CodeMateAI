"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Flag,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Edit2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, FeatureFlagItem } from "@/lib/api";
import { toast } from "sonner";

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = React.useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Edit Dialog
  const [editingFlag, setEditingFlag] = React.useState<FeatureFlagItem | null>(null);
  const [rolloutPct, setRolloutPct] = React.useState(100);
  const [targetAudience, setTargetAudience] = React.useState("all");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchFlags = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getFeatureFlags();
      setFlags(data);
    } catch (err) {
      console.error("Failed to load feature flags:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlagItem) => {
    try {
      await adminApi.updateFeatureFlag(flag.id, { is_enabled: !flag.is_enabled });
      toast.success(`Flag "${flag.name}" set to ${!flag.is_enabled ? "ENABLED" : "DISABLED"}`);
      await fetchFlags();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle flag");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlag) return;
    try {
      setSubmitting(true);
      await adminApi.updateFeatureFlag(editingFlag.id, {
        rollout_percentage: Number(rolloutPct),
        target_audience: targetAudience,
      });
      toast.success(`Rollout updated for "${editingFlag.name}"`);
      setEditingFlag(null);
      await fetchFlags();
    } catch (err: any) {
      toast.error(err.message || "Failed to update flag configuration");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<FeatureFlagItem>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Feature" />,
      cell: ({ row }) => {
        const f = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-foreground">{f.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{f.key}</span>
            {f.description && (
              <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{f.description}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "is_enabled",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const f = row.original;
        return (
          <button
            onClick={() => handleToggle(f)}
            className="inline-flex items-center gap-1.5 text-xs font-mono transition-opacity hover:opacity-80"
          >
            {f.is_enabled ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-semibold">
                <CheckCircle2 className="size-3" /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground">
                <XCircle className="size-3" /> Disabled
              </span>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: "rollout_percentage",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rollout" />,
      cell: ({ row }) => {
        const pct = row.getValue("rollout_percentage") as number;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs text-foreground font-semibold">{pct}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "target_audience",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Audience" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {row.getValue("target_audience")}
        </Badge>
      ),
    },
    {
      accessorKey: "minimum_plan",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Min Plan" />,
      cell: ({ row }) => {
        const plan = row.getValue("minimum_plan") as string | null;
        return plan ? (
          <span className="font-mono text-xs text-primary">{plan.replace("PLAN_", "")}</span>
        ) : (
          <span className="text-muted-foreground text-xs">All Tiers</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const f = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingFlag(f);
              setRolloutPct(f.rollout_percentage);
              setTargetAudience(f.target_audience);
            }}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sliders className="size-3.5" />
            <span>Configure</span>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature Flags & Gradual Rollouts"
        description="Gate experimental capabilities, configure rollout percentages, and manage target user segments."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Feature Flags" }]}
        badge={`${flags.length} Flags Registered`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFlags}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={flags}
        searchKey="name"
        searchPlaceholder="Filter feature flags by name..."
        isLoading={loading}
        exportFilename="codemate_feature_flags.csv"
      />

      {/* Configure Dialog */}
      <Dialog open={editingFlag !== null} onOpenChange={(open) => !open && setEditingFlag(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveConfig}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span>Configure Rollout: {editingFlag?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Adjust the user percentage and target audience gating for <span className="font-mono text-foreground">{editingFlag?.key}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="font-medium text-foreground">Rollout Percentage</label>
                  <span className="font-mono font-bold text-primary">{rolloutPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={rolloutPct}
                  onChange={(e) => setRolloutPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-hidden"
                >
                  <option value="all">All Users (Public)</option>
                  <option value="beta_users">Beta Testing Users</option>
                  <option value="subscribers_only">Paid Subscribers Only</option>
                  <option value="internal_staff">Internal Administrators</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingFlag(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Save Rollout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

