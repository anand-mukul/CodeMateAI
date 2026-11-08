"use client";

import * as React from "react";
import {
  Shield,
  KeyRound,
  Laptop,
  Globe,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authApi, sessionsApi, CustomerSessionItem, parseErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CustomerSecurityPage() {
  const { user } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);

  // Sessions state
  const [sessions, setSessions] = React.useState<CustomerSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = React.useState(true);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [revokingAll, setRevokingAll] = React.useState(false);

  const fetchSessions = React.useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await sessionsApi.list();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to load active sessions."));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to change password."));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await sessionsApi.revoke(sessionId);
      toast.success("Session terminated.");
      await fetchSessions();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to revoke session."));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Are you sure you want to log out all other active sessions?")) return;

    try {
      setRevokingAll(true);
      await sessionsApi.revokeAll();
      toast.success("All other sessions terminated.");
      await fetchSessions();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to revoke sessions."));
    } finally {
      setRevokingAll(false);
    }
  };

  const isLocalAuth = (user?.auth_provider || "local").toLowerCase() === "local";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Security &amp; Sessions
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account credentials, password updates, and active device logins.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Password Management */}
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="size-4 text-indigo-500" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password with Argon2id cryptographic protection.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {!isLocalAuth ? (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldAlert className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Your account uses Google OAuth authentication. Password changes are managed via your Google Account.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Current Password</label>
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">New Password</label>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Confirm New Password</label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full h-9 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Account Security Overview Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="size-4 text-emerald-500" />
                <span>Security Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Email Verification</span>
                {user?.email_verified ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                    Unverified
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hash Algorithm</span>
                <span className="font-mono text-[11px] text-foreground">Argon2id (Memory 64MB)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Laptop className="size-4 text-indigo-500" />
                  <span>Active Browser Sessions</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Browser sessions currently authenticated to your CodeMate account.
                </CardDescription>
              </div>

              {sessions.filter((s) => !s.is_current).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokingAll}
                  onClick={handleRevokeAllSessions}
                  className="h-8 text-xs text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
                >
                  {revokingAll ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Trash2 className="size-3.5 mr-1.5" />
                  )}
                  <span>Revoke Other Sessions</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {loadingSessions ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="size-5 animate-spin text-indigo-500" />
                  <span>Loading active sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No other active browser sessions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-lg border border-border/60 bg-background/50 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <Globe className="size-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {session.device_name || session.browser_name || "Web Portal Session"}
                            </span>
                            {session.is_current ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0">
                                This Device
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                            <span>Device ID: {session.device_id.slice(0, 12)}...</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-2.5" />
                              Last seen: {new Date(session.last_seen_at || session.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!session.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokingId === session.id}
                          onClick={() => handleRevokeSession(session.id)}
                          className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          {revokingId === session.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          <span className="sr-only sm:not-sr-only sm:ml-1.5">Revoke</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

