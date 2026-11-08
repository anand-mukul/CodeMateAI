"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  UserCheck,
  UserX,
  Ban,
  Shield,
  Eye,
  LogOut,
  RefreshCw,
  Search,
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
import { Input } from "@/components/ui/input";
import { adminApi, AdminUserItem } from "@/lib/api";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<AdminUserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Dialog states
  const [actionUser, setActionUser] = React.useState<AdminUserItem | null>(null);
  const [dialogType, setDialogType] = React.useState<"ban" | "suspend" | null>(null);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async () => {
    if (!actionUser || !dialogType) return;
    try {
      setSubmitting(true);
      if (dialogType === "ban") {
        await adminApi.banUser(actionUser.id, reason || "Administrative ban");
      } else if (dialogType === "suspend") {
        await adminApi.suspendUser(actionUser.id, reason || "Administrative suspension");
      }
      setDialogType(null);
      setActionUser(null);
      setReason("");
      await fetchUsers();
    } catch (err) {
      console.error("Failed to apply action:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await adminApi.reactivateUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to reactivate user:", err);
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await adminApi.unbanUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to unban user:", err);
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      await adminApi.revokeUserSessions(userId);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
    }
  };

  const columns: ColumnDef<AdminUserItem>[] = [
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const u = row.original;
        const initial = (u.display_name || u.email || "U").charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initial}
            </div>
            <div className="flex flex-col">
              <Link
                href={`/admin/users/${u.id}`}
                className="text-xs font-medium text-foreground hover:underline hover:text-primary transition-colors"
              >
                {u.display_name || "Anonymous User"}
              </Link>
              <span className="text-[11px] text-muted-foreground font-mono">{u.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => {
        const role = (row.getValue("role") as string).toUpperCase();
        const isAdmin = role.includes("ADMIN");
        return (
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className="text-[10px] font-mono tracking-wider"
          >
            {isAdmin ? "ADMIN" : "USER"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "account_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue("account_status") as string).toLowerCase();
        let colorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

        if (status === "suspended") {
          colorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
        } else if (status === "banned") {
          colorClass = "bg-rose-500/10 text-rose-500 border-rose-500/20";
        }

        return (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase font-mono ${colorClass}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => {
        const plan = (row.getValue("plan_name") as string) || "FREE";
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {plan.replace("PLAN_", "").replace("_", " ")}
          </span>
        );
      },
    },
    {
      accessorKey: "active_sessions_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sessions" />,
      cell: ({ row }) => {
        const count = (row.getValue("active_sessions_count") as number) || 0;
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {count} {count === 1 ? "device" : "devices"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const val = row.getValue("created_at") as string;
        const date = val ? new Date(val).toLocaleDateString() : "—";
        return <span className="text-xs font-mono text-muted-foreground">{date}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const u = row.original;
        const isBanned = u.account_status.toLowerCase() === "banned";
        const isSuspended = u.account_status.toLowerCase() === "suspended";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">User Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/admin/users/${u.id}`)}>
                <Eye className="mr-2 size-3.5" />
                <span>View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isSuspended ? (
                <DropdownMenuItem onClick={() => handleReactivate(u.id)}>
                  <UserCheck className="mr-2 size-3.5 text-emerald-500" />
                  <span>Reactivate User</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setActionUser(u);
                    setDialogType("suspend");
                  }}
                  disabled={isBanned}
                >
                  <UserX className="mr-2 size-3.5 text-amber-500" />
                  <span>Suspend Access</span>
                </DropdownMenuItem>
              )}

              {isBanned ? (
                <DropdownMenuItem onClick={() => handleUnban(u.id)}>
                  <UserCheck className="mr-2 size-3.5 text-emerald-500" />
                  <span>Lift Permanent Ban</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setActionUser(u);
                    setDialogType("ban");
                  }}
                  className="text-rose-500 focus:text-rose-500"
                >
                  <Ban className="mr-2 size-3.5" />
                  <span>Ban Permanently</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRevokeSessions(u.id)}>
                <LogOut className="mr-2 size-3.5 text-muted-foreground" />
                <span>Revoke All Sessions</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Accounts"
        description="Search, inspect, and manage individual user accounts, plan entitlements, and active sessions."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Users" }]}
        badge={`${users.length} Customers`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
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
        data={users}
        searchKey="email"
        searchPlaceholder="Filter customers by email..."
        isLoading={loading}
        exportFilename="codemate_users_export.csv"
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />

      {/* Confirmation Dialog for Ban / Suspend */}
      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === "ban" ? (
                <>
                  <Ban className="size-4 text-rose-500" />
                  <span>Ban User Permanently</span>
                </>
              ) : (
                <>
                  <UserX className="size-4 text-amber-500" />
                  <span>Suspend User Account</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "ban"
                ? `You are about to permanently ban ${actionUser?.email}. All active sessions and API keys will be revoked immediately.`
                : `Temporarily suspend access for ${actionUser?.email}. The user will be logged out and cannot call the API.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-foreground">
              Reason for action <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder={dialogType === "ban" ? "e.g., Severe abuse of AI token quotas" : "e.g., Billing investigation"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogType(null);
                setActionUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={dialogType === "ban" ? "destructive" : "default"}
              size="sm"
              disabled={submitting || !reason.trim()}
              onClick={handleAction}
            >
              {submitting ? "Applying..." : dialogType === "ban" ? "Confirm Ban" : "Suspend Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

