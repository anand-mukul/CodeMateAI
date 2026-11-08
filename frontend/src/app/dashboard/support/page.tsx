"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { supportApi, SupportTicketDetailItem } from "@/lib/api";
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
import { toast } from "sonner";

const CATEGORIES = [
  { value: "billing_payment", label: "Billing & Payment Inquiry" },
  { value: "account_access", label: "Account & Device Access" },
  { value: "ai_functionality", label: "AI Code Solution Issue" },
  { value: "editor_integration", label: "Chrome Extension Integration" },
  { value: "project_intelligence", label: "Multi-File Project Analysis" },
  { value: "bug_report", label: "Bug Report" },
  { value: "general_support", label: "General Support" },
];

export default function CustomerSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = React.useState<SupportTicketDetailItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // New Ticket Modal State
  const [openModal, setOpenModal] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState("billing_payment");
  const [priority, setPriority] = React.useState("NORMAL");
  const [initialMessage, setInitialMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchTickets = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await supportApi.getTickets();
      setTickets(data);
    } catch (err) {
      console.error("Failed to load customer tickets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

    try {
      setSubmitting(true);
      const newTicket = await supportApi.createTicket({
        subject: subject.trim(),
        category,
        priority,
        initial_message: initialMessage.trim(),
      });
      toast.success("Support ticket created successfully.");
      setOpenModal(false);
      setSubject("");
      setInitialMessage("");
      router.push(`/dashboard/support/${newTicket.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create support ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Help & Support Desk</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Submit support inquiries, track resolution status, and receive direct developer assistance.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setOpenModal(true)}
            className="h-8 gap-1.5 text-xs shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>New Ticket</span>
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="font-semibold text-xs text-foreground">Your Support Inquiries</span>
          <span className="font-mono text-xs text-muted-foreground">{tickets.length} Ticket(s)</span>
        </div>

        <div className="divide-y divide-border/60">
          {tickets.length > 0 ? (
            tickets.map((ticket) => {
              const status = ticket.status.toLowerCase();
              let statusColor = "bg-primary/10 text-primary border-primary/20";
              if (status === "resolved") statusColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
              else if (status === "closed") statusColor = "bg-muted text-muted-foreground border-border";

              return (
                <Link
                  key={ticket.id}
                  href={`/dashboard/support/${ticket.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground hover:underline">
                        {ticket.subject}
                      </span>
                      <span
                        className={`inline-flex rounded border px-1.5 py-0.2 text-[9px] font-mono uppercase font-semibold ${statusColor}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>ID: {ticket.id.slice(0, 8)}...</span>
                      <span>•</span>
                      <span className="uppercase">{ticket.category.replace(/_/g, " ")}</span>
                      <span>•</span>
                      <span>{ticket.messages?.length || 0} message(s)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono self-start sm:self-auto">
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
              <LifeBuoy className="mx-auto size-8 text-muted-foreground/60" />
              <p>You have not submitted any support tickets yet.</p>
              <Button size="sm" onClick={() => setOpenModal(true)} className="text-xs h-8">
                Create First Ticket
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateTicket}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-primary" />
                <span>Create Support Ticket</span>
              </DialogTitle>
              <DialogDescription>
                Describe your inquiry or technical issue. Internal notes are private to administrators.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g., Question regarding daily solve quota reset or billing receipt"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  minLength={5}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden font-mono"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide complete context, steps to reproduce, or transaction order details..."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  required
                  minLength={10}
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !subject.trim() || !initialMessage.trim()}>
                {submitting ? "Submitting..." : "Open Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

