"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LifeBuoy, Plus, MessageSquare, Send, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supportApi, SupportTicketItem, parseErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function SupportDesk() {
  const { user, isSupport } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = isSupport
        ? await supportApi.getAdminTickets()
        : await supportApi.getTickets();
      setTickets(data);
    } catch (err) {
      console.error(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isSupport]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      await supportApi.createTicket({ title, description, category, priority });
      setTitle("");
      setDescription("");
      setShowCreate(false);
      await loadTickets();
      toast.success("Support ticket created. Our team will review it shortly.");
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to create ticket."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await supportApi.updateTicketStatus(ticketId, newStatus);
      toast.success(`Ticket status updated to ${newStatus}.`);
      await loadTickets();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to update ticket status."));
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "urgent":
        return "bg-red-500/15 text-red-300 border-red-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "low":
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
      default:
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "resolved":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "in_progress":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "closed":
        return "bg-zinc-800 text-zinc-500 border-zinc-700";
      default:
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-950/80 border-white/[0.08]">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {isSupport ? "Customer Support Triage Queue" : "Support Tickets & Inquiries"}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {tickets.length} {isSupport ? "Queue Items" : "My Tickets"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Direct channel to our engineering and billing team. Average response time: &lt; 2 hours.
              </p>
            </div>

            {!isSupport && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showCreate ? "Cancel" : "Open New Ticket"}</span>
              </button>
            )}
          </div>

          {/* New Ticket Form */}
          {showCreate && (
            <form onSubmit={handleCreateTicket} className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08] space-y-3 pt-4">
              <div>
                <label className="text-xs font-medium text-zinc-300">Subject / Issue Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding AutoPilot Pass activation or extension sync"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 mt-1 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-300 mt-1 focus:outline-none"
                  >
                    <option value="technical">Technical / Extension Issue</option>
                    <option value="billing">Billing / Subscription</option>
                    <option value="account">Account Access</option>
                    <option value="feedback">Product Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-300 mt-1 focus:outline-none"
                  >
                    <option value="low">Low (General Query)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="urgent">Critical (Blocker)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what occurred, any error messages, and steps to reproduce..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 mt-1 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting..." : "Submit Ticket"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Ticket List */}
          <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 border-b border-white/[0.08] text-zinc-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  {isSupport && <th className="py-3 px-4">User</th>}
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  {isSupport && <th className="py-3 px-4 text-right">Triage Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                {loading && tickets.length === 0 ? (
                  <tr>
                    <td colSpan={isSupport ? 7 : 5} className="py-8 text-center text-zinc-500">
                      Loading tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={isSupport ? 7 : 5} className="py-8 text-center text-zinc-500">
                      No support tickets recorded.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{t.title}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-xs">{t.description}</div>
                      </td>

                      {isSupport && (
                        <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                          {t.user_email || t.user_id.slice(0, 10)}
                        </td>
                      )}

                      <td className="py-3 px-4 font-mono text-zinc-400 capitalize">
                        {t.category}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPriorityColor(t.priority)} uppercase`}>
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(t.status)} uppercase`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>

                      {isSupport && (
                        <td className="py-3 px-4 text-right">
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                            className="bg-black/50 border border-white/[0.1] rounded px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

