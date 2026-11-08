"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  Receipt,
  CreditCard,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { paymentsApi, CustomerPaymentItem } from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CustomerBillingPage() {
  const [payments, setPayments] = React.useState<CustomerPaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchPayments = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await paymentsApi.getHistory();
      setPayments(data);
    } catch (err) {
      console.error("Failed to load payment history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalPaise = payments.reduce((sum, p) => (p.payment_status.toLowerCase() === "paid" ? sum + p.amount : sum), 0);
  const totalRupees = Math.round(totalPaise / 100);

  const columns: ColumnDef<CustomerPaymentItem>[] = [
    {
      accessorKey: "provider_order_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order Reference" />,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-mono font-medium text-xs text-foreground">{p.provider_order_id}</span>
            {p.provider_payment_id && (
              <span className="font-mono text-[10px] text-muted-foreground">{p.provider_payment_id}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const amountPaise = row.getValue("amount") as number;
        const rupees = (amountPaise / 100).toFixed(2);
        return <span className="font-mono font-bold text-xs text-foreground">₹{rupees}</span>;
      },
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue("payment_status") as string).toLowerCase();
        let color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (status === "failed") color = "bg-rose-500/10 text-rose-500 border-rose-500/20";
        else if (status === "refunded") color = "bg-amber-500/10 text-amber-500 border-amber-500/20";
        else if (status === "created") color = "bg-muted text-muted-foreground border-border";

        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${color}`}>
            {status}
          </span>
        );
      },
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
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleString() : "—"}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Billing & Receipts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit your order history, verified Razorpay payment references, and transaction timestamps.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Link
            href="/dashboard/subscription"
            className={cn(buttonVariants({ size: "sm" }), "h-8 gap-1.5 text-xs shadow-xs")}
          >
            <Sparkles className="size-3.5" />
            <span>Manage Plan</span>
          </Link>
        </div>
      </div>

      {/* Financial Summary Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Paid</span>
          <p className="text-2xl font-bold font-mono text-foreground">₹{totalRupees.toLocaleString()}</p>
          <span className="text-[11px] text-muted-foreground">Settled across all orders</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Recorded Transactions</span>
          <p className="text-2xl font-bold font-mono text-foreground">{payments.length}</p>
          <span className="text-[11px] text-muted-foreground">Order receipts in ledger</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Billing Processor</span>
          <div className="flex items-center gap-1.5 text-foreground font-mono font-bold text-lg pt-0.5">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Razorpay Gateway</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Direct signature verification</span>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        searchKey="provider_order_id"
        searchPlaceholder="Filter receipts by order ID..."
        isLoading={loading}
        exportFilename="codemate_my_receipts.csv"
      />
    </div>
  );
}

