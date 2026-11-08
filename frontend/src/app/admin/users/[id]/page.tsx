"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  CreditCard,
  Laptop,
  Clock,
  FileText,
  Ban,
  UserCheck,
  UserX,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminApi,
  AdminUserDetails,
} from "@/lib/api";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [data, setData] = React.useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [noteText, setNoteText] = React.useState("");
  const [submittingNote, setSubmittingNote] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "subscription" | "payments" | "devices" | "notes">("overview");

  const loadUser = React.useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await adminApi.getUserDetails(userId);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !userId) return;
    try {
      setSubmittingNote(true);
      await adminApi.addUserNote(userId, noteText.trim());
      setNoteText("");
      await loadUser();
    } catch (err) {
      console.error("Failed to add admin note:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await adminApi.revokeUserDevice(userId, deviceId);
      await loadUser();
    } catch (err) {
      console.error("Failed to revoke device:", err);
    }
  };

  const handleSuspendToggle = async () => {
    if (!data) return;
    const isSuspended = data.user.account_status.toLowerCase() === "suspended";
    try {
      if (isSuspended) {
        await adminApi.reactivateUser(userId);
      } else {
        await adminApi.suspendUser(userId, "Admin manual suspension");
      }
      await loadUser();
    } catch (err) {
      console.error("Failed to toggle suspension:", err);
    }
  };

  const handleBanToggle = async () => {
    if (!data) return;
    const isBanned = data.user.account_status.toLowerCase() === "banned";
    try {
      if (isBanned) {
        await adminApi.unbanUser(userId);
      } else {
        await adminApi.banUser(userId, "Admin manual ban");
      }
      await loadUser();
    } catch (err) {
      console.error("Failed to toggle ban:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xs text-muted-foreground animate-pulse">Loading customer profile...</div>
      </div>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <AlertCircle className="mx-auto size-8 text-rose-500" />
        <h3 className="text-sm font-semibold text-foreground">User Not Found</h3>
        <p className="text-xs text-muted-foreground">The requested user ID does not exist or has been removed.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/users")}>
          Back to Users
        </Button>
      </div>
    );
  }

  const user = data.user;
  const sub = data.subscription;
  const isSuspended = user.account_status.toLowerCase() === "suspended";
  const isBanned = user.account_status.toLowerCase() === "banned";

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Customers</span>
        </Link>
        <AdminPageHeader
          title={user.display_name || user.email}
          description={`Customer ID: ${user.id}`}
          badge={user.account_status.toUpperCase()}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant={isSuspended ? "default" : "outline"}
                size="sm"
                onClick={handleSuspendToggle}
                className="h-8 gap-1.5 text-xs"
              >
                {isSuspended ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}
                <span>{isSuspended ? "Reactivate" : "Suspend"}</span>
              </Button>
              <Button
                variant={isBanned ? "default" : "destructive"}
                size="sm"
                onClick={handleBanToggle}
                className="h-8 gap-1.5 text-xs"
              >
                <Ban className="size-3.5" />
                <span>{isBanned ? "Lift Ban" : "Ban User"}</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-6 text-xs font-medium">
        {[
          { key: "overview", label: "Overview" },
          { key: "subscription", label: "Subscription & Quotas" },
          { key: "payments", label: `Payments (${data.payments?.length || 0})` },
          { key: "devices", label: `Devices (${data.devices?.length || 0})` },
          { key: "notes", label: `Admin Notes (${data.notes?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Information</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Display Name</span>
                <span className="font-medium text-foreground">{user.display_name || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-mono text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email Verified</span>
                <span className="font-medium text-foreground">{user.email_verified ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Account Status</span>
                <span className="font-mono uppercase font-semibold text-foreground">{user.account_status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Registered At</span>
                <span className="font-mono text-muted-foreground">{new Date(user.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Telemetry</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Active Sessions</span>
                <span className="font-mono font-medium text-foreground">{data.active_sessions?.length || 0} active</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Bound Devices</span>
                <span className="font-mono font-medium text-foreground">{data.devices?.length || 0} registered</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="font-mono font-semibold text-primary">{sub?.plan_name || "FREE"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Total Payments</span>
                <span className="font-mono text-foreground">{data.payments?.length || 0} transaction(s)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Subscription */}
      {activeTab === "subscription" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Plan & Entitlements</h3>
              <p className="text-xs text-muted-foreground">Server-enforced quotas for individual customer</p>
            </div>
            <Badge variant="default" className="font-mono uppercase">
              {sub?.status || "INACTIVE"}
            </Badge>
          </div>

          {sub ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <span className="text-xs text-muted-foreground">Assigned Plan</span>
                <p className="mt-1 text-lg font-bold font-mono text-foreground">{sub.plan_name}</p>
                <span className="text-[11px] text-muted-foreground">Expires: {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "Never"}</span>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <span className="text-xs text-muted-foreground">Daily AI Solve Quota</span>
                <p className="mt-1 text-lg font-bold font-mono text-foreground">{sub.daily_ai_solves_used} / {sub.ai_usage_limit}</p>
                <span className="text-[11px] text-muted-foreground">Resets at midnight UTC</span>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <span className="text-xs text-muted-foreground">Device Limit</span>
                <p className="mt-1 text-lg font-bold font-mono text-foreground">{sub.device_limit} Allowed</p>
                <span className="text-[11px] text-muted-foreground">Extension + Web Client</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Customer is on the Free tier.</p>
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === "payments" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/40 font-mono text-muted-foreground">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Payment ID</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.payments?.length ? (
                data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-foreground">{p.order_id}</td>
                    <td className="p-3 font-mono text-muted-foreground">{p.payment_id || "—"}</td>
                    <td className="p-3 font-mono font-semibold text-foreground">₹{p.amount_rupees.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase text-emerald-500">
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground uppercase">{p.provider}</td>
                    <td className="p-3 font-mono text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No payment history recorded for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Devices */}
      {activeTab === "devices" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-muted/40 font-mono text-muted-foreground">
              <tr>
                <th className="p-3">Device ID</th>
                <th className="p-3">Browser / Platform</th>
                <th className="p-3">Extension Version</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.devices?.length ? (
                data.devices.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono text-foreground">{d.device_id}</td>
                    <td className="p-3 text-muted-foreground">{d.browser_name || "Chrome"} {d.browser_version || ""}</td>
                    <td className="p-3 font-mono text-muted-foreground">{d.extension_version || "1.0.0"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          d.device_status === "active"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {d.device_status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "Recently"}
                    </td>
                    <td className="p-3 text-right">
                      {d.device_status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeDevice(d.device_id)}
                          className="h-7 text-xs text-rose-500 hover:text-rose-600"
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No registered devices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Admin Notes */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Input
              placeholder="Add an internal note about this user (visible only to administrators)..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="text-xs flex-1"
            />
            <Button type="submit" size="sm" disabled={submittingNote || !noteText.trim()} className="gap-1.5 text-xs">
              <Send className="size-3.5" />
              <span>{submittingNote ? "Adding..." : "Add Note"}</span>
            </Button>
          </form>

          <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
            {data.notes?.length ? (
              data.notes.map((n) => (
                <div key={n.id} className="p-4 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">Admin ID: {n.admin_id.slice(0, 8)}...</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{n.note}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No admin notes recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

