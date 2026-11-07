/**
 * CodeMate AI — Feedback, Support & Admin API Service (feedback-support-service.ts)
 */

import { AuthService } from './auth-service';

export interface UserFeedbackDTO {
  id: string;
  category: 'general' | 'bug_report' | 'usability' | 'ai_quality' | 'suggestion';
  title: string;
  description: string;
  satisfaction_score?: number;
  status: string;
  created_at: string;
}

export interface FeatureRequestDTO {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: 'NEW' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'DUPLICATE' | 'ON_HOLD';
  vote_count: number;
  admin_notes?: string;
  has_voted: boolean;
  created_at: string;
  comments?: Array<{
    id: string;
    comment_text: string;
    is_official_response: boolean;
    created_at: string;
  }>;
}

export interface SupportMessageDTO {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  attachment_path?: string;
  is_internal_note: boolean;
  created_at: string;
}

export interface SupportTicketDTO {
  id: string;
  user_id: string;
  assigned_agent_id?: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'WAITING_FOR_SUPPORT' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  last_reply_at?: string;
  messages?: SupportMessageDTO[];
}

export interface FeatureFlagDTO {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  target_audience: 'all' | 'beta_users' | 'internal_staff' | 'subscribers_only';
  minimum_plan?: string;
  rollout_percentage: number;
  created_at: string;
}

export interface AdminAnalyticsOverviewDTO {
  total_users: number;
  active_users_daily: number;
  active_users_weekly: number;
  active_users_monthly: number;
  free_users: number;
  pro_users: number;
  premium_users: number;
  total_ai_requests: number;
  overall_success_rate: number;
  total_tokens_consumed: number;
  estimated_cost_usd: number;
}

export interface AdminUserDTO {
  id: string;
  email: string;
  display_name: string;
  role: string;
  account_status: string;
  email_verified: boolean;
  plan_name: string;
  created_at: string;
  last_login_at?: string;
  device_count: number;
  active_session_count: number;
}

export interface AdminAuditLogDTO {
  id: string;
  admin_user_id?: string;
  target_user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details_json?: string;
  ip_address?: string;
  created_at: string;
}

export class FeedbackSupportService {
  // --- Feedback ---
  public static async submitFeedback(payload: {
    category: 'general' | 'bug_report' | 'usability' | 'ai_quality' | 'suggestion';
    title: string;
    description: string;
    satisfaction_score?: number;
  }): Promise<UserFeedbackDTO> {
    return AuthService.fetchAuth<UserFeedbackDTO>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async listMyFeedback(): Promise<UserFeedbackDTO[]> {
    return AuthService.fetchAuth<UserFeedbackDTO[]>('/api/feedback');
  }

  // --- Feature Requests ---
  public static async listFeatureRequests(category?: string, search?: string): Promise<FeatureRequestDTO[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return AuthService.fetchAuth<FeatureRequestDTO[]>(`/api/feature-requests${qs}`);
  }

  public static async createFeatureRequest(payload: {
    title: string;
    description: string;
    category: string;
  }): Promise<FeatureRequestDTO> {
    return AuthService.fetchAuth<FeatureRequestDTO>('/api/feature-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async voteFeatureRequest(id: string): Promise<{ status: string; vote_count: number; has_voted: boolean }> {
    return AuthService.fetchAuth(`/api/feature-requests/${id}/vote`, {
      method: 'POST',
    });
  }

  public static async unvoteFeatureRequest(id: string): Promise<{ status: string; vote_count: number; has_voted: boolean }> {
    return AuthService.fetchAuth(`/api/feature-requests/${id}/vote`, {
      method: 'DELETE',
    });
  }

  public static async addComment(id: string, comment_text: string) {
    return AuthService.fetchAuth(`/api/feature-requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment_text }),
    });
  }

  // --- Customer Support ---
  public static async listMyTickets(): Promise<SupportTicketDTO[]> {
    return AuthService.fetchAuth<SupportTicketDTO[]>('/api/support/tickets');
  }

  public static async getTicketDetails(id: string): Promise<SupportTicketDTO> {
    return AuthService.fetchAuth<SupportTicketDTO>(`/api/support/tickets/${id}`);
  }

  public static async createTicket(payload: {
    subject: string;
    category: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    initial_message: string;
  }): Promise<SupportTicketDTO> {
    return AuthService.fetchAuth<SupportTicketDTO>('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async replyToTicket(id: string, message_text: string): Promise<SupportMessageDTO> {
    return AuthService.fetchAuth<SupportMessageDTO>(`/api/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message_text }),
    });
  }

  // --- Feature Flags Evaluation ---
  public static async evaluateFlags(): Promise<Record<string, boolean>> {
    try {
      return await AuthService.fetchAuth<Record<string, boolean>>('/api/feature-flags/evaluate');
    } catch {
      return {};
    }
  }

  // --- Admin Endpoints ---
  public static async getAdminOverview(): Promise<AdminAnalyticsOverviewDTO> {
    return AuthService.fetchAuth<AdminAnalyticsOverviewDTO>('/api/admin/analytics/overview');
  }

  public static async getAdminUsers(search?: string): Promise<AdminUserDTO[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return AuthService.fetchAuth<AdminUserDTO[]>(`/api/admin/users${qs}`);
  }

  public static async suspendUser(userId: string, reason: string): Promise<any> {
    return AuthService.fetchAuth(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public static async reactivateUser(userId: string): Promise<any> {
    return AuthService.fetchAuth(`/api/admin/users/${userId}/reactivate`, {
      method: 'POST',
    });
  }

  public static async updateUserRole(userId: string, role: string, reason: string): Promise<any> {
    return AuthService.fetchAuth(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role, reason }),
    });
  }

  public static async getAdminAuditLogs(limit = 50): Promise<AdminAuditLogDTO[]> {
    return AuthService.fetchAuth<AdminAuditLogDTO[]>(`/api/admin/audit-logs?limit=${limit}`);
  }

  public static async getAdminFeatureFlags(): Promise<FeatureFlagDTO[]> {
    return AuthService.fetchAuth<FeatureFlagDTO[]>('/api/admin/feature-flags');
  }

  public static async toggleFeatureFlag(flagId: string, is_enabled: boolean, reason: string): Promise<FeatureFlagDTO> {
    return AuthService.fetchAuth<FeatureFlagDTO>(`/api/admin/feature-flags/${flagId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_enabled, change_reason: reason }),
    });
  }

  public static async getAdminTickets(): Promise<SupportTicketDTO[]> {
    return AuthService.fetchAuth<SupportTicketDTO[]>('/api/support/admin/tickets');
  }

  public static async postInternalNote(ticketId: string, message_text: string): Promise<SupportMessageDTO> {
    return AuthService.fetchAuth<SupportMessageDTO>(`/api/support/admin/tickets/${ticketId}/internal-notes`, {
      method: 'POST',
      body: JSON.stringify({ message_text }),
    });
  }

  public static async updateTicketStatus(ticketId: string, status: string, notes?: string): Promise<SupportTicketDTO> {
    return AuthService.fetchAuth<SupportTicketDTO>(`/api/support/admin/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution_notes: notes }),
    });
  }
}

