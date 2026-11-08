"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Tag,
  Plus,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
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
import { adminApi, CouponItem } from "@/lib/api";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = React.useState<CouponItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Create Modal
  const [openCreate, setOpenCreate] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState(20);
  const [maxUses, setMaxUses] = React.useState(100);
  const [creating, setCreating] = React.useState(false);

  const fetchCoupons = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getCoupons();
      setCoupons(data);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleToggle = async (couponId: string) => {
    try {
      await adminApi.toggleCoupon(couponId);
      await fetchCoupons();
    } catch (err) {
      console.error("Failed to toggle coupon:", err);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to permanently delete this discount coupon?")) return;
    try {
      await adminApi.deleteCoupon(couponId);
      await fetchCoupons();
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      setCreating(true);
      await adminApi.createCoupon({
        code: code.trim().toUpperCase(),
        discount_percent: Number(discountPercent),
        max_uses: Number(maxUses),
      });
      setOpenCreate(false);
      setCode("");
      await fetchCoupons();
    } catch (err) {
      console.error("Failed to create coupon:", err);
    } finally {
      setCreating(false);
    }
  };

  const columns: ColumnDef<CouponItem>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Coupon Code" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-2">
            <Tag className="size-3.5 text-primary" />
            <span className="font-mono font-bold tracking-wider text-xs text-foreground">
              {c.code}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "discount_percent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discount" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/20 bg-emerald-500/10 text-xs">
          {row.getValue("discount_percent")}% OFF
        </Badge>
      ),
    },
    {
      accessorKey: "current_uses",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Redemptions" />,
      cell: ({ row }) => {
        const c = row.original;
        const pct = Math.round((c.current_uses / (c.max_uses || 1)) * 100);
        return (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-foreground font-semibold">{c.current_uses}</span>
            <span className="text-muted-foreground">/ {c.max_uses}</span>
            <span className="text-[10px] text-muted-foreground">({pct}%)</span>
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const active = row.getValue("active") as boolean;
        return (
          <button
            onClick={() => handleToggle(row.original.id)}
            className="inline-flex items-center gap-1.5 text-xs font-mono transition-opacity hover:opacity-80"
          >
            {active ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
                <CheckCircle2 className="size-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground">
                <XCircle className="size-3" /> Paused
              </span>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const val = row.getValue("created_at") as string;
        return <span className="font-mono text-xs text-muted-foreground">{val ? new Date(val).toLocaleDateString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(row.original.id)}
          className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotional Coupons"
        description="Create and audit discount codes, redemption velocity, and checkout campaign incentives."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Coupons" }]}
        badge={`${coupons.length} Promo Codes`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCoupons}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setOpenCreate(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              <span>New Coupon</span>
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={coupons}
        searchKey="code"
        searchPlaceholder="Filter coupons by code..."
        isLoading={loading}
        exportFilename="codemate_coupons_export.csv"
      />

      {/* Create Coupon Modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCoupon}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                <span>Create Discount Coupon</span>
              </DialogTitle>
              <DialogDescription>
                Discount codes apply instant checkout reductions for Razorpay orders.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g., SUMMER50, DEVSPECIAL"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Discount Percentage (%)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    required
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Maximum Usages</label>
                  <Input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    required
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating || !code.trim()}>
                {creating ? "Creating..." : "Save Coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

