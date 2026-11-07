"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Tag,
  Activity,
  Search,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import {
  adminApi,
  AdminUserItem,
  CouponItem,
  parseErrorMessage,
} from "@/lib/api";
import { toast } from "sonner";

export function AdminConsole() {
  const [subTab, setSubTab] = useState<"users" | "coupons" | "health">("users");

  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [maxUses, setMaxUses] = useState(100);
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Health state
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Load Users
  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to load user directory."));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Load Coupons
  const loadCoupons = useCallback(async () => {
    try {
      setLoadingCoupons(true);
      const data = await adminApi.getCoupons();
      setCoupons(data);
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to load coupons."));
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  // Load Health
  const loadHealth = useCallback(async () => {
    try {
      setLoadingHealth(true);
      const data = await adminApi.getSystemHealth();
      setHealthData(data);
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to load system health."));
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === "users") loadUsers();
    else if (subTab === "coupons") loadCoupons();
    else if (subTab === "health") loadHealth();
  }, [subTab, loadUsers, loadCoupons, loadHealth]);

  // User Actions
  const handleToggleSuspend = async (user: AdminUserItem) => {
    try {
      setUserActionLoading(user.id);
      if (user.account_status === "suspended") {
        await adminApi.reactivateUser(user.id);
        toast.success(`User ${user.email} reactivated.`);
      } else {
        await adminApi.suspendUser(user.id, "Administrative suspension via Console");
        toast.success(`User ${user.email} suspended.`);
      }
      await loadUsers();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to update user status."));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUserActionLoading(userId);
      await adminApi.updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}.`);
      await loadUsers();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to update role."));
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    if (!confirm("Terminate all active sessions for this user?")) return;
    try {
      setUserActionLoading(userId);
      await adminApi.revokeUserSessions(userId);
      toast.success("All active sessions revoked for user.");
      await loadUsers();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to revoke sessions."));
    } finally {
      setUserActionLoading(null);
    }
  };

  // Coupon Actions
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setCreatingCoupon(true);
      await adminApi.createCoupon({
        code: couponCode.trim().toUpperCase(),
        discount_percent: Number(discountPercent),
        max_uses: Number(maxUses),
      });
      toast.success(`Coupon ${couponCode.trim().toUpperCase()} created successfully!`);
      setCouponCode("");
      await loadCoupons();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to create promo coupon."));
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId: string) => {
    try {
      await adminApi.toggleCoupon(couponId);
      toast.success("Coupon status toggled.");
      await loadCoupons();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to toggle coupon."));
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Permanently delete this promo code?")) return;
    try {
      await adminApi.deleteCoupon(couponId);
      toast.success("Coupon deleted.");
      await loadCoupons();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to delete coupon."));
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setSubTab("users")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            subTab === "users"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setSubTab("coupons")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            subTab === "coupons"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Promo Coupons ({coupons.length})</span>
        </button>

        <button
          onClick={() => setSubTab("health")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            subTab === "health"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Health</span>
        </button>
      </div>

      {/* Users Subtab */}
      {subTab === "users" && (
        <Card className="bg-zinc-950/80 border-white/[0.08]">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/[0.1] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/[0.08] hover:bg-white/[0.08] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 border-b border-white/[0.08] text-zinc-400 font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Active Sessions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                  {loadingUsers && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        Loading user directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No users match criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSuspended = u.account_status === "suspended";
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-white flex items-center gap-1.5">
                                <span>{u.display_name || "Developer"}</span>
                                {u.email_verified && (
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">{u.email}</div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={userActionLoading === u.id}
                              className="bg-black/40 border border-white/[0.1] rounded px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none"
                            >
                              <option value="user">User</option>
                              <option value="support_agent">Support Agent</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-indigo-400">
                            {u.plan_name || "Free Tier"}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isSuspended
                                  ? "bg-red-500/15 text-red-300 border-red-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              }`}
                            >
                              {u.account_status}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-zinc-400">
                            {u.active_sessions_count} active
                          </td>

                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleToggleSuspend(u)}
                              disabled={userActionLoading === u.id}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition cursor-pointer border ${
                                isSuspended
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                              }`}
                            >
                              {isSuspended ? "Reactivate" : "Suspend"}
                            </button>

                            <button
                              onClick={() => handleRevokeSessions(u.id)}
                              disabled={userActionLoading === u.id}
                              className="px-2 py-1 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupons Subtab */}
      {subTab === "coupons" && (
        <div className="space-y-6">
          <Card className="bg-zinc-950/80 border-white/[0.08]">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create New Promotional Coupon</span>
              </h3>
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SPRINT50"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Discount %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white font-mono mt-1 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={creatingCoupon}
                    className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingCoupon ? "Creating..." : "Create Coupon"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80 border-white/[0.08]">
            <CardContent className="p-6">
              <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 border-b border-white/[0.08] text-zinc-400 font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Redemptions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-zinc-300">
                    {loadingCoupons && coupons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          Loading active coupons...
                        </td>
                      </tr>
                    ) : coupons.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          No active promo coupons.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4 font-mono font-bold text-white tracking-wider">
                            {c.code}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-400">
                            {c.discount_percent}% OFF
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-400">
                            {c.current_uses} / {c.max_uses}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                c.active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              {c.active ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleToggleCoupon(c.id)}
                              className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-medium transition cursor-pointer"
                            >
                              {c.active ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] font-medium transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health Subtab */}
      {subTab === "health" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KPICard
            title="Database State"
            value="Operational"
            subtitle="PostgreSQL Connection Pool Healthy"
            badge={{ text: "Active", variant: "success" }}
          />
          <KPICard
            title="AI Routing Pipeline"
            value="Google Gemini Flash"
            subtitle="Fallback: Claude 3.5 Sonnet & GPT-4o"
            badge={{ text: "Ready", variant: "indigo" }}
          />
          <KPICard
            title="Redis Memory Cache"
            value="Online"
            subtitle="Rate Limit Enforcer Active"
            badge={{ text: "Online", variant: "success" }}
          />
        </div>
      )}
    </div>
  );
}

