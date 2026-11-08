"use client";

import * as React from "react";
import {
  Settings,
  ShieldAlert,
  Megaphone,
  Cpu,
  UserPlus,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminPlatformSettings } from "@/lib/api";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<AdminPlatformSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // Form states
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [announcementBanner, setAnnouncementBanner] = React.useState("");
  const [dailyCap, setDailyCap] = React.useState(100000);
  const [allowRegistrations, setAllowRegistrations] = React.useState(true);

  const fetchSettings = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.getSettings();
      setSettings(data);
      setMaintenanceMode(data.maintenance_mode);
      setAnnouncementBanner(data.announcement_banner || "");
      setDailyCap(data.daily_ai_request_global_cap);
      setAllowRegistrations(data.allow_new_registrations);
    } catch (err) {
      console.error("Failed to load platform settings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await adminApi.updateSettings({
        maintenance_mode: maintenanceMode,
        announcement_banner: announcementBanner.trim() || null,
        daily_ai_request_global_cap: Number(dailyCap),
        allow_new_registrations: allowRegistrations,
      });
      setSettings(updated);
      toast.success("Platform settings updated and logged to audit trail!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Global Platform Settings"
        description="Emergency switches, broadcast announcements, rate capping, and customer onboarding controls."
        breadcrumbs={[{ label: "Overview", href: "/admin" }, { label: "Settings" }]}
        badge="Live Production Configuration"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Maintenance Mode & Safety */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Maintenance Mode</h3>
            </div>
            {maintenanceMode ? (
              <Badge variant="destructive" className="font-mono text-[10px]">
                MAINTENANCE ACTIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                NORMAL OPERATION
              </Badge>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-foreground">Enable Platform Maintenance Mode</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When enabled, non-admin API requests will return 503 Service Unavailable with maintenance instructions. Admin access remains active.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>
        </div>

        {/* Global Broadcast Announcement */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Megaphone className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Broadcast Announcement Banner</h3>
          </div>

          <div className="space-y-2 text-xs">
            <label className="font-medium text-foreground">
              Banner Message (Markdown / Plain Text)
            </label>
            <Input
              placeholder="e.g. Scheduled database maintenance will occur this Sunday at 02:00 UTC."
              value={announcementBanner}
              onChange={(e) => setAnnouncementBanner(e.target.value)}
              className="text-xs"
            />
            <span className="text-[11px] text-muted-foreground">
              Leave blank to disable the announcement banner for users.
            </span>
          </div>
        </div>

        {/* AI & Registration Caps */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Cpu className="size-4 text-sky-500" />
            <h3 className="text-sm font-semibold text-foreground">AI Quota Safety & Customer Access</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <label className="font-medium text-foreground">
                Global Daily AI Request Hard Cap
              </label>
              <Input
                type="number"
                min="1000"
                step="5000"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="font-mono text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                Emergency breaker: stops all AI generation if total requests exceed this threshold in a 24h window.
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="space-y-1">
                <span className="font-medium text-foreground block">Allow New User Registrations</span>
                <p className="text-[11px] text-muted-foreground">
                  If disabled, new user signups via `/api/auth/register` will be rejected.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowRegistrations}
                  onChange={(e) => setAllowRegistrations(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground font-mono">
            Last updated: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : "Never"}
          </span>
          <Button type="submit" size="sm" disabled={saving} className="gap-1.5 text-xs">
            <Save className="size-3.5" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

