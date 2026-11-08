"use client";

import * as React from "react";
import {
  User,
  Mail,
  Shield,
  Palette,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Lock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { authApi, parseErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

export default function CustomerSettingsPage() {
  const { user, refreshUser, resendVerification } = useAuth();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  React.useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }

    try {
      setSavingProfile(true);
      await authApi.updateProfile(displayName.trim());
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendingEmail(true);
      await resendVerification();
      toast.success("Verification link dispatched to your inbox.");
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to send verification email."));
    } finally {
      setResendingEmail(false);
    }
  };

  const copyUserId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success("User ID copied to clipboard.");
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Profile &amp; Preferences
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your developer profile details, appearance themes, and privacy settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Profile & Identity) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-indigo-500" />
                <span>Developer Profile</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Your public identity across CodeMate AI and extension sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Display Name
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Chen"
                      className="max-w-md h-9 text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingProfile || displayName === user?.display_name}
                      className="h-9 px-4 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                    Primary Email
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground font-medium">
                      {user?.email || "—"}
                    </span>
                    {user?.email_verified ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0 h-4.5">
                        <CheckCircle2 className="size-2.5 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 py-0 h-4.5">
                        <AlertCircle className="size-2.5 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  {!user?.email_verified && (
                    <Button
                      variant="link"
                      size="sm"
                      disabled={resendingEmail}
                      onClick={handleResendVerification}
                      className="h-auto p-0 text-[11px] text-indigo-400 hover:text-indigo-300 mt-1"
                    >
                      {resendingEmail ? "Sending email..." : "Resend verification link"}
                    </Button>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                    Account Role
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-[11px] uppercase tracking-wider">
                      {user?.role || "USER"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Individual Account</span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                    Authentication Provider
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-foreground">
                    <Lock className="size-3 text-muted-foreground" />
                    <span>{user?.auth_provider?.toUpperCase() || "LOCAL"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] mb-1 font-medium">
                    Account ID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {user?.id || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={copyUserId}
                      className="text-muted-foreground hover:text-foreground transition p-0.5"
                      title="Copy Account ID"
                    >
                      {copiedId ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme & Appearance Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="size-4 text-purple-500" />
                <span>Interface Theme</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select your preferred appearance mode for the customer portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition cursor-pointer ${
                    theme === "dark"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-xs"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <div className="size-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                    <div className="size-2.5 rounded-full bg-indigo-400" />
                  </div>
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition cursor-pointer ${
                    theme === "light"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-xs"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <div className="size-6 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center">
                    <div className="size-2.5 rounded-full bg-indigo-600" />
                  </div>
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition cursor-pointer ${
                    theme === "system"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-xs"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <div className="size-6 rounded-full bg-gradient-to-tr from-zinc-900 to-zinc-100 border border-zinc-500 flex items-center justify-center" />
                  <span>System</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Privacy & Security Shortcuts) */}
        <div className="space-y-6">
          {/* Privacy & Zero-Retention Notice */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="size-4 text-emerald-500" />
                <span>Code Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                CodeMate AI enforces strict <span className="text-foreground font-medium">zero source code persistence</span>.
              </p>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Problem context and solution tokens are processed in-flight and not stored.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>No proprietary code is used for public model training.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Argon2id password hashing with multi-device session rotation.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold">
                Security &amp; Account Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Link
                href="/dashboard/security"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="size-3.5 text-indigo-400" />
                  <span className="font-medium text-foreground">Change Password &amp; Sessions</span>
                </div>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground transition" />
              </Link>

              <Link
                href="/dashboard/devices"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="size-3.5 text-purple-400" />
                  <span className="font-medium text-foreground">Connected Chrome Devices</span>
                </div>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground transition" />
              </Link>

              <div className="pt-3 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Need to close your account?
                </span>
                <Link
                  href="/dashboard/support"
                  className="text-xs text-rose-400 hover:text-rose-300 transition font-medium"
                >
                  Contact support for account deletion →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

