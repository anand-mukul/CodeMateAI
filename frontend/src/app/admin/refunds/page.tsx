"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminPaymentItem } from "@/lib/api";

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = React.useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchRefunds = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getRefunds();
      setRefunds(data);
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const columns: ColumnDef<AdminPaymentItem>[] = [
    {
      accessorKey: "order_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order ID" />,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-mono font-medium text-foreground text-xs">{p.order_id}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{p.provider_payment_id || p.provider_order_id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "user_email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Link
            href={`/admin/users/${p.user_id}`}
            className="text-xs font-mono font-medium text-foreground hover:underline hover:text-primary transition-colors"
          >
            {p.user_email || p.user_id.slice(0, 8)}
          </Link>
        );
      },
    },
    {
      accessorKey: "amount_rupees",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Refunded Amount" />,
      cell: ({ row }) => {
        const amt = row.getValue("amount_rupees") as number;
        return (
          <span className="font-mono font-bold text-xs text-amber-500">
            ₹{amt.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: () => (
        <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/10">
          REFUNDED
        </Badge>
      ),
    },
    {
      accessorKey: "provider",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gateway" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {row.getValue("provider")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const dt = row.getValue("created_at") as string;
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleDateString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link
          href={`/admin/users/${row.original.user_id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <span>Customer</span>
          <ExternalLink className="size-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Refunds Ledger"
        description="Audit reversed charges, credit settlements, and customer payment dispute records."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Refunds" }]}
        badge={`${refunds.length} Reversed Charges`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRefunds}
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
        data={refunds}
        searchKey="order_id"
        searchPlaceholder="Filter refunded orders..."
        isLoading={loading}
        exportFilename="codemate_refunds_ledger.csv"
      />
    </div>
  );
}

