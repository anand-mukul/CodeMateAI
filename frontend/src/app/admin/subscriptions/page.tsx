"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Layers,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, AdminSubscriptionItem } from "@/lib/api";

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = React.useState<AdminSubscriptionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<AdminSubscriptionItem | null>(null);
  const [cancelImmediate, setCancelImmediate] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fetchSubscriptions = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCancelSubscription = async () => {
    if (!cancelTarget) return;
    try {
      setSubmitting(true);
      await adminApi.cancelSubscription(cancelTarget.id, cancelImmediate);
      setCancelTarget(null);
      await fetchSubscriptions();
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<AdminSubscriptionItem>[] = [
    {
      accessorKey: "user_email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex flex-col">
            <Link
              href={`/admin/users/${sub.user_id}`}
              className="text-xs font-mono font-medium text-foreground hover:underline hover:text-primary transition-colors"
            >
              {sub.user_email}
            </Link>
            <span className="text-[10px] text-muted-foreground font-mono">ID: {sub.id.slice(0, 8)}...</span>
          </div>
        );
      },
    },
    {
      accessorKey: "plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => {
        const name = (row.getValue("plan_name") as string) || "PLAN_CORE_PASS";
        const cleanName = name.replace("PLAN_", "").replace(/_/g, " ");
        return (
          <Badge variant="outline" className="font-mono text-[10px]">
            {cleanName}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue("status") as string).toLowerCase();
        let color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (status === "canceled") {
          color = "bg-rose-500/10 text-rose-500 border-rose-500/20";
        } else if (status === "past_due") {
          color = "bg-amber-500/10 text-amber-500 border-amber-500/20";
        }

        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${color}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "billing_provider",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provider" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {row.getValue("billing_provider")}
        </span>
      ),
    },
    {
      accessorKey: "current_period_end",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Period End" />,
      cell: ({ row }) => {
        const end = row.getValue("current_period_end") as string;
        const cancelAtEnd = row.original.cancel_at_period_end;
        return (
          <div className="flex flex-col text-xs font-mono">
            <span className="text-foreground">{end ? new Date(end).toLocaleDateString() : "—"}</span>
            {cancelAtEnd && (
              <span className="text-[10px] text-amber-500 font-semibold">Cancels at end</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Started" />,
      cell: ({ row }) => {
        const dt = row.getValue("created_at") as string;
        return <span className="text-xs font-mono text-muted-foreground">{dt ? new Date(dt).toLocaleDateString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sub = row.original;
        const isCanceled = sub.status.toLowerCase() === "canceled";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Subscription</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/admin/users/${sub.user_id}`)}>
                <ExternalLink className="mr-2 size-3.5" />
                <span>Customer Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isCanceled && (
                <DropdownMenuItem
                  onClick={() => {
                    setCancelTarget(sub);
                    setCancelImmediate(false);
                  }}
                  className="text-rose-500 focus:text-rose-500"
                >
                  <XCircle className="mr-2 size-3.5" />
                  <span>Cancel Plan</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscriptions & Entitlements"
        description="Reconcile active developer subscriptions, renewal schedules, and entitlement enforcement."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Subscriptions" }]}
        badge={`${subscriptions.length} Subscriptions`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubscriptions}
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
        data={subscriptions}
        searchKey="user_email"
        searchPlaceholder="Filter subscriptions by customer email..."
        isLoading={loading}
        exportFilename="codemate_subscriptions_export.csv"
      />

      {/* Cancel Dialog */}
      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-500" />
              <span>Cancel Customer Subscription</span>
            </DialogTitle>
            <DialogDescription>
              Subscription for customer <span className="font-mono text-foreground">{cancelTarget?.user_email}</span> will be marked as canceled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelImmediate}
                onChange={(e) => setCancelImmediate(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-foreground font-medium">Cancel immediately and revoke features right now</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              If unchecked, the user retains access until the end of their current paid period.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
              Dismiss
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={submitting}
              onClick={handleCancelSubscription}
            >
              {submitting ? "Canceling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
