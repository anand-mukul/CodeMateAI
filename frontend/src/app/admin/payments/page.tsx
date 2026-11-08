"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  CreditCard,
  DollarSign,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { adminApi, AdminPaymentItem } from "@/lib/api";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = React.useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Refund Dialog
  const [refundTarget, setRefundTarget] = React.useState<AdminPaymentItem | null>(null);
  const [refundReason, setRefundReason] = React.useState("");
  const [partialAmountRupees, setPartialAmountRupees] = React.useState<string>("");
  const [submittingRefund, setSubmittingRefund] = React.useState(false);

  const fetchPayments = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getPayments();
      setPayments(data);
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleProcessRefund = async () => {
    if (!refundTarget || !refundReason.trim()) return;
    try {
      setSubmittingRefund(true);
      const amountPaise = partialAmountRupees ? Math.round(Number(partialAmountRupees) * 100) : undefined;
      await adminApi.processRefund(refundTarget.id, refundReason.trim(), amountPaise);
      setRefundTarget(null);
      setRefundReason("");
      setPartialAmountRupees("");
      await fetchPayments();
    } catch (err) {
      console.error("Failed to process refund:", err);
    } finally {
      setSubmittingRefund(false);
    }
  };

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
          <div className="flex flex-col">
            <Link
              href={`/admin/users/${p.user_id}`}
              className="text-xs font-mono font-medium text-foreground hover:underline hover:text-primary transition-colors"
            >
              {p.user_email || p.user_id.slice(0, 8)}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: "amount_rupees",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue("amount_rupees") as number;
        return (
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-foreground">
            <span>₹{amount.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "payment_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue("payment_status") as string).toLowerCase();
        let color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (status === "failed") {
          color = "bg-rose-500/10 text-rose-500 border-rose-500/20";
        } else if (status === "refunded") {
          color = "bg-amber-500/10 text-amber-500 border-amber-500/20";
        } else if (status === "created") {
          color = "bg-muted text-muted-foreground border-border";
        }

        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${color}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "coupon_code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Coupon" />,
      cell: ({ row }) => {
        const coupon = row.getValue("coupon_code") as string | null;
        return coupon ? (
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
            {coupon}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
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
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleDateString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const p = row.original;
        const isPaid = p.payment_status.toLowerCase() === "paid";
        const isRefunded = p.payment_status.toLowerCase() === "refunded";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Payment</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/admin/users/${p.user_id}`)}>
                <ExternalLink className="mr-2 size-3.5" />
                <span>Customer Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isPaid && !isRefunded && (
                <DropdownMenuItem
                  onClick={() => {
                    setRefundTarget(p);
                    setPartialAmountRupees(p.amount_rupees.toString());
                  }}
                  className="text-amber-500 focus:text-amber-500"
                >
                  <RotateCcw className="mr-2 size-3.5" />
                  <span>Issue Refund</span>
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
        title="Payment Reconciliation"
        description="Audit all checkout charges, Razorpay provider order IDs, verified timestamps, and refund transactions."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Payments" }]}
        badge={`${payments.length} Transactions`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
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
        data={payments}
        searchKey="order_id"
        searchPlaceholder="Filter by order ID..."
        isLoading={loading}
        exportFilename="codemate_payments_ledger.csv"
      />

      {/* Refund Modal */}
      <Dialog open={refundTarget !== null} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-4 text-amber-500" />
              <span>Process Payment Refund</span>
            </DialogTitle>
            <DialogDescription>
              Reconcile a refund for Order <span className="font-mono text-foreground">{refundTarget?.order_id}</span> via Razorpay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Refund Amount (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                max={refundTarget?.amount_rupees}
                value={partialAmountRupees}
                onChange={(e) => setPartialAmountRupees(e.target.value)}
                className="font-mono text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                Full amount: ₹{refundTarget?.amount_rupees.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Refund Reason <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g., Customer dissatisfaction with compilation latency"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRefundTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={submittingRefund || !refundReason.trim()}
              onClick={handleProcessRefund}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submittingRefund ? "Issuing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
