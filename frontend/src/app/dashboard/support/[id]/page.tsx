"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  supportApi,
  SupportTicketDetailItem,
  SupportMessageItem,
} from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = React.useState<SupportTicketDetailItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [replyText, setReplyText] = React.useState("");
  const [submittingReply, setSubmittingReply] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchTicket = React.useCallback(async () => {
    if (!ticketId) return;
    try {
      setRefreshing(true);
      const data = await supportApi.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      console.error("Failed to load ticket details:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticketId) return;

    try {
      setSubmittingReply(true);
      await supportApi.replyTicket(ticketId, replyText.trim());
      setReplyText("");
      toast.success("Reply sent to support desk.");
      await fetchTicket();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs text-muted-foreground animate-pulse">Loading support inquiry...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <AlertCircle className="mx-auto size-8 text-rose-500" />
        <h3 className="text-sm font-semibold text-foreground">Ticket Not Found</h3>
        <p className="text-xs text-muted-foreground">The requested ticket does not exist or you do not have permission to view it.</p>
        <Link
          href="/dashboard/support"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to Support Desk
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status.toLowerCase() === "closed" || ticket.status.toLowerCase() === "resolved";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to All Inquiries</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {ticket.subject}
              </h1>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {ticket.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Ticket ID: {ticket.id} • Category: {ticket.category.replace(/_/g, " ").toUpperCase()} • Priority: {ticket.priority}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTicket}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="space-y-4">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages
            .filter((m) => !m.is_internal_note) // Ensure zero internal notes leak
            .map((msg) => {
              const isStaff = msg.sender_role.toUpperCase() !== "USER";

              return (
                <div
                  key={msg.id}
                  className={`rounded-xl border p-4 shadow-2xs space-y-2 text-xs ${
                    isStaff
                      ? "border-primary/40 bg-primary/5 mr-4 sm:mr-12"
                      : "border-border bg-card ml-4 sm:ml-12"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isStaff ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        {isStaff ? "S" : "U"}
                      </div>
                      <span className="font-semibold text-foreground">
                        {isStaff ? "CodeMate Support Staff" : "You (Customer)"}
                      </span>
                      {isStaff && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 font-mono">
                          STAFF
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-foreground leading-relaxed whitespace-pre-wrap pl-7">
                    {msg.message_text}
                  </p>
                </div>
              );
            })
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            No message history recorded for this ticket.
          </div>
        )}
      </div>

      {/* Reply Box */}
      {!isClosed ? (
        <form onSubmit={handleSendReply} className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
          <label className="text-xs font-semibold text-foreground block">
            Post Customer Reply
          </label>
          <textarea
            rows={3}
            placeholder="Type your response to support staff..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Replies are delivered directly to the administrative support queue.
            </span>
            <Button type="submit" size="sm" disabled={submittingReply || !replyText.trim()} className="gap-1.5 text-xs">
              <Send className="size-3.5" />
              <span>{submittingReply ? "Sending..." : "Send Reply"}</span>
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          This support ticket is marked as {ticket.status.toUpperCase()}. Create a new ticket if you require further assistance.
        </div>
      )}
    </div>
  );
}

