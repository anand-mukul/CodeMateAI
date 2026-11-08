"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Shield,
  RefreshCw,
  Eye,
  FileCode,
  Clock,
  User,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, AdminAuditLogItem } from "@/lib/api";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<AdminAuditLogItem | null>(null);

  const fetchLogs = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AdminAuditLogItem>[] = [
    {
      accessorKey: "action",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        return (
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-primary" />
            <span className="font-mono font-semibold text-xs text-foreground">
              {action}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "admin_email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actor" />,
      cell: ({ row }) => {
        const l = row.original;
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {l.admin_email || `Admin (${l.admin_id.slice(0, 8)})`}
          </span>
        );
      },
    },
    {
      accessorKey: "resource_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Target Resource" />,
      cell: ({ row }) => {
        const l = row.original;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Badge variant="outline" className="text-[10px] uppercase">
              {l.resource_type || "SYSTEM"}
            </Badge>
            {l.resource_id && (
              <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">
                {l.resource_id}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: ({ column }) => <DataTableColumnHeader column={column} title="IP Address" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue("ip_address") || "127.0.0.1"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
      cell: ({ row }) => {
        const dt = row.getValue("created_at") as string;
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const l = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLog(l)}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-3.5" />
            <span>Details</span>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Immutable Audit Logs"
        description="Tamper-evident trail of administrative mutations, provider switches, fee grants, and policy changes."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Audit Logs" }]}
        badge="SOC2 / Compliance Trail"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
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
        data={logs}
        searchKey="action"
        searchPlaceholder="Filter audit events by action..."
        isLoading={loading}
        exportFilename="codemate_audit_logs.csv"
      />

      {/* JSON Detail Inspector Modal */}
      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="size-4 text-primary" />
              <span>Audit Event: {selectedLog?.action}</span>
            </DialogTitle>
            <DialogDescription>
              Logged on {selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 text-muted-foreground">
              <div>
                <span className="text-[10px] uppercase font-mono block">Admin Actor</span>
                <span className="font-mono text-foreground">{selectedLog?.admin_email || selectedLog?.admin_id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono block">IP Address</span>
                <span className="font-mono text-foreground">{selectedLog?.ip_address || "127.0.0.1"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-muted-foreground block">Payload Details</span>
              <pre className="max-h-60 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px] text-foreground border border-border">
                {JSON.stringify(selectedLog?.details || {}, null, 2)}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

