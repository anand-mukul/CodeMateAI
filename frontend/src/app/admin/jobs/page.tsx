"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Play,
  Activity,
  Layers,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminBackgroundJob } from "@/lib/api";

export default function AdminJobsPage() {
  const [jobs, setJobs] = React.useState<AdminBackgroundJob[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchJobs = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load background jobs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const columns: ColumnDef<AdminBackgroundJob>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
      cell: ({ row }) => {
        const j = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-foreground">{j.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">ID: {j.id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "schedule",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[10px]">
          {row.getValue("schedule")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const st = (row.getValue("status") as string).toLowerCase();
        let color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (st === "running") color = "bg-sky-500/10 text-sky-500 border-sky-500/20";
        else if (st === "failed") color = "bg-rose-500/10 text-rose-500 border-rose-500/20";

        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${color}`}>
            {st}
          </span>
        );
      },
    },
    {
      accessorKey: "last_run_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Execution" />,
      cell: ({ row }) => {
        const dt = row.getValue("last_run_at") as string | null;
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleString() : "Never"}</span>;
      },
    },
    {
      accessorKey: "duration_ms",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
      cell: ({ row }) => {
        const dur = row.getValue("duration_ms") as number | null;
        return <span className="font-mono text-xs text-foreground">{dur ? `${dur}ms` : "—"}</span>;
      },
    },
    {
      accessorKey: "next_run_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Next Trigger" />,
      cell: ({ row }) => {
        const dt = row.getValue("next_run_at") as string | null;
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleTimeString() : "Pending"}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Background Jobs & Operations"
        description="Cron schedules, database cleanup routines, daily analytics rollups, and cache warmers."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Background Jobs" }]}
        badge={`${jobs.length} Active Tasks`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
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
        data={jobs}
        searchKey="name"
        searchPlaceholder="Filter jobs by name..."
        isLoading={loading}
        exportFilename="codemate_background_jobs.csv"
      />
    </div>
  );
}

