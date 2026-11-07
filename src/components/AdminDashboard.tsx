/**
 * CodeMate AI — Phase 8 Internal Admin Dashboard (AdminDashboard.tsx)
 * 
 * Provides authorized staff (Super Admin, Admin, Support Agent, Analyst) with:
 * - SaaS & Product Performance Metrics
 * - User Governance & Account Lifecycle Management
 * - Customer Support Ticketing Inbox with Staff-Only Internal Notes
 * - Feature Request Moderation & Status Lifecycles
 * - Runtime Feature Flag Toggles & Percentage Rollouts
 * - Immutable Administrative Audit Log Inspection
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  BarChart3,
  Users,
  LifeBuoy,
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  FileText,
  RefreshCw,
  Search,
  Send,
  Lock,
  ChevronRight,
} from 'lucide-react';
import {
  FeedbackSupportService,
  AdminAnalyticsOverviewDTO,
  AdminUserDTO,
  AdminAuditLogDTO,
  FeatureFlagDTO,
  SupportTicketDTO,
  FeatureRequestDTO,
} from '../services/feedback-support-service';

interface AdminDashboardProps {
  userRole?: string;
  onNotify?: (message: string, isError?: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userRole = 'admin', onNotify }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'support' | 'requests' | 'flags' | 'audit'>('metrics');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Data states
  const [overview, setOverview] = useState<AdminAnalyticsOverviewDTO | null>(null);
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDTO[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagDTO[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketDTO[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDTO | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState<string>('');
  const [internalNoteText, setInternalNoteText] = useState<string>('');
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestDTO[]>([]);

  // Modals & Action States
  const [suspendingUser, setSuspendingUser] = useState<AdminUserDTO | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [rolePromotingUser, setRolePromotingUser] = useState<AdminUserDTO | null>(null);
  const [targetRole, setTargetRole] = useState<string>('support_agent');
  const [roleChangeReason, setRoleChangeReason] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'metrics') {
        const data = await FeedbackSupportService.getAdminOverview();
        setOverview(data);
      } else if (activeTab === 'users') {
        const data = await FeedbackSupportService.getAdminUsers(userSearch);
        setUsers(data);
      } else if (activeTab === 'support') {
        const data = await FeedbackSupportService.getAdminTickets();
        setSupportTickets(data);
      } else if (activeTab === 'requests') {
        const data = await FeedbackSupportService.listFeatureRequests();
        setFeatureRequests(data);
      } else if (activeTab === 'flags') {
        const data = await FeedbackSupportService.getAdminFeatureFlags();
        setFeatureFlags(data);
      } else if (activeTab === 'audit') {
        const data = await FeedbackSupportService.getAdminAuditLogs(50);
        setAuditLogs(data);
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to load administrative data', true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, userSearch, onNotify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle User Suspend
  const handleConfirmSuspend = async () => {
    if (!suspendingUser || !suspendReason.trim()) return;
    try {
      await FeedbackSupportService.suspendUser(suspendingUser.id, suspendReason);
      onNotify?.(`User ${suspendingUser.email} has been suspended.`, false);
      setSuspendingUser(null);
      setSuspendReason('');
      loadData();
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to suspend user', true);
    }
  };

  // Handle User Reactivate
  const handleReactivateUser = async (user: AdminUserDTO) => {
    try {
      await FeedbackSupportService.reactivateUser(user.id);
      onNotify?.(`User ${user.email} reactivated successfully.`, false);
      loadData();
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to reactivate user', true);
    }
  };

  // Handle Role Update
  const handleConfirmRoleUpdate = async () => {
    if (!rolePromotingUser || !roleChangeReason.trim()) return;
    try {
      await FeedbackSupportService.updateUserRole(rolePromotingUser.id, targetRole, roleChangeReason);
      onNotify?.(`Role updated for ${rolePromotingUser.email} to ${targetRole}.`, false);
      setRolePromotingUser(null);
      setRoleChangeReason('');
      loadData();
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to update user role', true);
    }
  };

  // Handle Flag Toggle
  const handleToggleFlag = async (flag: FeatureFlagDTO) => {
    const reason = prompt(`Enter change reason for toggling flag '${flag.key}':`);
    if (!reason || reason.trim().length < 5) {
      alert('A valid change reason of at least 5 characters is required for auditing.');
      return;
    }
    try {
      await FeedbackSupportService.toggleFeatureFlag(flag.id, !flag.is_enabled, reason);
      onNotify?.(`Flag '${flag.key}' set to ${!flag.is_enabled ? 'ENABLED' : 'DISABLED'}.`, false);
      loadData();
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to toggle feature flag', true);
    }
  };

  // Handle Post Support Internal Note
  const handlePostInternalNote = async () => {
    if (!selectedTicket || !internalNoteText.trim()) return;
    try {
      await FeedbackSupportService.postInternalNote(selectedTicket.id, internalNoteText);
      onNotify?.('Internal note recorded (staff-only visibility).', false);
      setInternalNoteText('');
      const updated = await FeedbackSupportService.getTicketDetails(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to post internal note', true);
    }
  };

  // Handle Staff Public Reply
  const handlePostStaffReply = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      await FeedbackSupportService.replyToTicket(selectedTicket.id, ticketReplyText);
      onNotify?.('Reply dispatched to customer.', false);
      setTicketReplyText('');
      const updated = await FeedbackSupportService.getTicketDetails(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to post reply', true);
    }
  };

  // Handle Ticket Status Change
  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const updated = await FeedbackSupportService.updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket(updated);
      onNotify?.(`Ticket status changed to ${status}.`, false);
      loadData();
    } catch (err: any) {
      onNotify?.(err.message || 'Failed to update ticket status', true);
    }
  };

  const isSuperAdmin = userRole.toLowerCase() === 'super_admin';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-sans text-xs animate-fade-in">
      {/* Admin Header Banner */}
      <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-xs">Admin Control Center</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {userRole}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">Server-Side RBAC & Audit Enforcement Active</span>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 overflow-x-auto text-[11px]">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'metrics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users</span>
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'support' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Support ({supportTickets.filter((t) => t.status === 'OPEN').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'requests' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Features</span>
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'flags' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ToggleRight className="w-3.5 h-3.5" />
          <span>Flags</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit</span>
        </button>
      </div>

      {/* Tab 1: SaaS & Performance Metrics */}
      {activeTab === 'metrics' && (
        <div className="p-3.5 flex flex-col gap-3">
          {overview ? (
            <>
              {/* User KPI Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Registered</span>
                  <span className="text-base font-bold text-slate-100">{overview.total_users}</span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">DAU / WAU / MAU</span>
                  <span className="text-sm font-semibold text-slate-100">
                    {overview.active_users_daily} / {overview.active_users_weekly} / {overview.active_users_monthly}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Paid Subscribers</span>
                  <span className="text-sm font-semibold text-indigo-400">
                    Pro: {overview.pro_users} | Prem: {overview.premium_users}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Estimated AI Cost</span>
                  <span className="text-sm font-semibold text-emerald-400">${overview.estimated_cost_usd}</span>
                </div>
              </div>

              {/* AI Reliability Card */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">AI Engine Reliability</span>
                  <span className="text-emerald-400 font-bold">{overview.overall_success_rate}% Success</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Total AI Requests: {overview.total_ai_requests}</span>
                  <span>Tokens Consumed: {overview.total_tokens_consumed.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-500">Loading SaaS metrics...</div>
          )}
        </div>
      )}

      {/* Tab 2: User Governance */}
      {activeTab === 'users' && (
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
            >
              Filter
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200">{u.display_name}</span>
                    <span className="text-slate-400 text-[11px] block">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      u.account_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {u.account_status}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Plan: {u.plan_name} | {u.device_count} dev | {u.active_session_count} sess</span>
                  <div className="flex items-center gap-1.5">
                    {u.account_status === 'active' ? (
                      <button
                        onClick={() => setSuspendingUser(u)}
                        className="text-red-400 hover:text-red-300 text-[10px] underline"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivateUser(u)}
                        className="text-emerald-400 hover:text-emerald-300 text-[10px] underline"
                      >
                        Reactivate
                      </button>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => setRolePromotingUser(u)}
                        className="text-indigo-400 hover:text-indigo-300 text-[10px] underline ml-1"
                      >
                        Change Role
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Customer Support Ticketing Inbox */}
      {activeTab === 'support' && (
        <div className="p-3.5 flex flex-col gap-3">
          {!selectedTicket ? (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {supportTickets.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No support tickets found.</div>
              ) : (
                supportTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={async () => {
                      const full = await FeedbackSupportService.getTicketDetails(t.id);
                      setSelectedTicket(full);
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          t.status === 'OPEN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {t.status}
                        </span>
                        <span className="font-semibold text-slate-200">{t.subject}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Category: {t.category} | Priority: {t.priority}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Ticket Header & Back Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                >
                  ← Back to Inbox
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px]"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="WAITING_FOR_USER">WAITING_FOR_USER</option>
                    <option value="WAITING_FOR_SUPPORT">WAITING_FOR_SUPPORT</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {selectedTicket.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border ${
                      m.is_internal_note
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-100'
                        : m.sender_role === 'user'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-indigo-950/30 border-indigo-800/60 text-indigo-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        {m.is_internal_note && <Lock className="w-3 h-3 text-amber-400" />}
                        {m.is_internal_note ? 'STAFF INTERNAL NOTE' : m.sender_role === 'user' ? 'Customer' : 'Support Staff'}
                      </span>
                      <span className="text-slate-500">{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{m.message_text}</p>
                  </div>
                ))}
              </div>

              {/* Reply Section */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                {/* Public Reply */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Type customer reply..."
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handlePostStaffReply}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>

                {/* Staff Internal Note Input */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="🔒 Post internal staff note (confidential)..."
                    value={internalNoteText}
                    onChange={(e) => setInternalNoteText(e.target.value)}
                    className="flex-1 bg-amber-950/20 border border-amber-900/60 rounded-xl px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500 placeholder-amber-700/60"
                  />
                  <button
                    onClick={handlePostInternalNote}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Note</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Feature Requests Moderation */}
      {activeTab === 'requests' && (
        <div className="p-3.5 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {featureRequests.map((fr) => (
            <div key={fr.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{fr.title}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                  {fr.vote_count} votes
                </span>
              </div>
              <p className="text-slate-400 text-xs">{fr.description}</p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Status: <strong className="text-slate-300">{fr.status}</strong></span>
                <select
                  value={fr.status}
                  onChange={async (e) => {
                    await FeedbackSupportService.addComment(fr.id, `Status transitioned to ${e.target.value}`);
                    onNotify?.(`Updated status to ${e.target.value}`, false);
                    loadData();
                  }}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-0.5 text-[10px]"
                >
                  <option value="NEW">NEW</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="PLANNED">PLANNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DECLINED">DECLINED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Feature Flags */}
      {activeTab === 'flags' && (
        <div className="p-3.5 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {featureFlags.map((flag) => (
            <div key={flag.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{flag.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({flag.key})</span>
                </div>
                <span className="text-[11px] text-slate-400 block">{flag.description}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Rollout: {flag.rollout_percentage}% | Audience: {flag.target_audience}
                </span>
              </div>

              <button
                onClick={() => handleToggleFlag(flag)}
                className={`p-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors ${
                  flag.is_enabled
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {flag.is_enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                <span>{flag.is_enabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 6: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-3.5 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-indigo-400">{log.action}</span>
                <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
              <span className="text-slate-400">
                Resource: {log.resource_type} ({log.resource_id?.substring(0, 8)}...)
              </span>
              {log.details_json && (
                <pre className="text-[10px] bg-slate-900 p-1.5 rounded text-slate-400 font-mono overflow-x-auto">
                  {log.details_json}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suspend User Modal */}
      {suspendingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-sm w-full flex flex-col gap-3">
            <h4 className="font-semibold text-slate-100">Suspend Account</h4>
            <p className="text-slate-400 text-xs">
              Are you sure you want to suspend <strong>{suspendingUser.email}</strong>? All active sessions will be terminated immediately.
            </p>
            <input
              type="text"
              placeholder="Reason for suspension (min 5 characters)..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSuspendingUser(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Promotion Modal */}
      {rolePromotingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-sm w-full flex flex-col gap-3">
            <h4 className="font-semibold text-slate-100">Change Role: {rolePromotingUser.email}</h4>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs"
            >
              <option value="user">User</option>
              <option value="analyst">Analyst</option>
              <option value="support_agent">Support Agent</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <input
              type="text"
              placeholder="Reason for role change (min 5 characters)..."
              value={roleChangeReason}
              onChange={(e) => setRoleChangeReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRolePromotingUser(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleUpdate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
