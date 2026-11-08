"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  LifeBuoy,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Eye,
  MessageSquare,
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
import { supportApi, SupportTicketDetailItem } from "@/lib/api";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const [tickets, setTickets] = React.useState<SupportTicketDetailItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // View & Status Modal
  const [activeTicket, setActiveTicket] = React.useState<SupportTicketDetailItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  const fetchTickets = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await supportApi.getAdminTickets();
      setTickets(data);
    } catch (err) {
      console.error("Failed to load support tickets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      setUpdatingStatus(true);
      await supportApi.updateTicketStatus(ticketId, status);
      toast.success(`Ticket marked as ${status.toUpperCase()}`);
      if (activeTicket && activeTicket.id === ticketId) {
        setActiveTicket({ ...activeTicket, status: status as any });
      }
      await fetchTickets();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const columns: ColumnDef<SupportTicketDetailItem>[] = [
    {
      accessorKey: "subject",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ticket" />,
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-foreground">{t.subject}</span>
            <span className="font-mono text-[11px] text-muted-foreground">ID: {t.id.slice(0, 8)}...</span>
          </div>
        );
      },
    },
    {
      accessorKey: "user_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const t = row.original;
        return (
          <Link
            href={`/admin/users/${t.user_id}`}
            className="text-xs font-mono text-muted-foreground hover:underline hover:text-primary transition-colors"
          >
            {t.user_id.slice(0, 8)}...
          </Link>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => {
        const priority = (row.getValue("priority") as string).toLowerCase();
        let color = "text-muted-foreground";
        if (priority === "urgent" || priority === "high") color = "text-rose-500 font-bold";
        else if (priority === "medium") color = "text-amber-500 font-semibold";

        return <span className={`font-mono text-xs uppercase ${color}`}>{priority}</span>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = (row.getValue("status") as string).toLowerCase();
        let color = "bg-primary/10 text-primary border-primary/20";
        if (status === "resolved") color = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        else if (status === "closed") color = "bg-muted text-muted-foreground border-border";

        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${color}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
      cell: ({ row }) => {
        const dt = row.getValue("created_at") as string;
        return <span className="font-mono text-xs text-muted-foreground">{dt ? new Date(dt).toLocaleDateString() : "—"}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTicket(t)}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support & Customer Inquiries"
        description="Inspect, prioritize, and resolve developer issues, billing requests, and bug reports."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Support" }]}
        badge={`${tickets.length} Tickets`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
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
        data={tickets}
        searchKey="subject"
        searchPlaceholder="Filter support tickets by subject..."
        isLoading={loading}
        exportFilename="codemate_support_tickets.csv"
      />

      {/* Ticket Details & Resolution Modal */}
      <Dialog open={activeTicket !== null} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" />
              <span>Ticket: {activeTicket?.subject}</span>
            </DialogTitle>
            <DialogDescription>
              Customer ID: <span className="font-mono text-foreground">{activeTicket?.user_id}</span> • Created:{" "}
              {activeTicket?.created_at ? new Date(activeTicket.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg bg-muted/30 p-3 border border-border/50">
              {activeTicket?.messages && activeTicket.messages.length > 0 ? (
                activeTicket.messages.map((m) => (
                  <div key={m.id} className="p-2.5 rounded bg-background border border-border/60 space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="font-semibold text-foreground uppercase">{m.sender_role}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{m.message_text}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No message thread available.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground block text-[11px]">Category</span>
                <span className="font-mono uppercase font-semibold text-foreground">{activeTicket?.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Priority</span>
                <span className="font-mono uppercase font-semibold text-rose-500">{activeTicket?.priority}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <span className="font-semibold text-foreground block">Update Ticket Status</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={activeTicket?.status === "in_progress" ? "default" : "outline"}
                  onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, "in_progress")}
                  disabled={updatingStatus}
                  className="text-xs h-7"
                >
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant={activeTicket?.status === "resolved" ? "default" : "outline"}
                  onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, "resolved")}
                  disabled={updatingStatus}
                  className="text-xs h-7 text-emerald-500 hover:text-emerald-600"
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant={activeTicket?.status === "closed" ? "default" : "outline"}
                  onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, "closed")}
                  disabled={updatingStatus}
                  className="text-xs h-7 text-muted-foreground"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveTicket(null)}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

