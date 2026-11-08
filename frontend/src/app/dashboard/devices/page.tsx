"use client";

import * as React from "react";
import {
  Laptop,
  Shield,
  Smartphone,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import {
  devicesApi,
  DeviceItem,
  sessionsApi,
  CustomerSessionItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CustomerDevicesPage() {
  const [devices, setDevices] = React.useState<DeviceItem[]>([]);
  const [sessions, setSessions] = React.useState<CustomerSessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const [devRes, sessRes] = await Promise.allSettled([
        devicesApi.list(),
        sessionsApi.list(),
      ]);

      if (devRes.status === "fulfilled") setDevices(devRes.value);
      if (sessRes.status === "fulfilled") setSessions(sessRes.value);
    } catch (err) {
      console.error("Failed to load device data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to disconnect this device? The extension will be logged out.")) return;
    try {
      setRevokingId(deviceId);
      await devicesApi.revoke(deviceId);
      toast.success("Device disconnected successfully.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke device");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await sessionsApi.revoke(sessionId);
      toast.success("Session terminated.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate session");
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Terminate all other active sessions? You will stay logged in on this browser.")) return;
    try {
      await sessionsApi.revokeAll();
      toast.success("All other sessions terminated.");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate sessions");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Connected Devices & Extension</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your registered Chrome extension clients, active web tokens, and browser sessions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
          className="h-8 gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Extension Pairing Helper */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5">
          <Terminal className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">How Extension Device Binding Works</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When you install the CodeMate AI Chrome extension, clicking &quot;Connect to Portal&quot; binds a hardware-safe device identifier to your account. This ensures your daily quota is synced seamlessly between your web portal and your browser side panel.
        </p>
      </div>

      {/* Registered Devices List */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Laptop className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Registered Devices</h3>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {devices.filter((d) => d.device_status === "active").length} Active Device(s)
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {devices.length > 0 ? (
            devices.map((device) => (
              <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {device.device_name || "Chrome Extension Client"}
                    </span>
                    <span
                      className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-mono uppercase ${
                        device.device_status === "active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {device.device_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>ID: {device.device_id.slice(0, 16)}...</span>
                    <span>{device.browser_name || "Chrome"} {device.browser_version || ""}</span>
                    <span>Ext: v{device.extension_version || "1.0.0"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleDateString() : "Recently"}
                  </span>
                  {device.device_status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeDevice(device.device_id)}
                      disabled={revokingId === device.device_id}
                      className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      {revokingId === device.device_id ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No devices registered yet. Open the CodeMate AI Chrome extension to connect.
            </div>
          )}
        </div>
      </div>

      {/* Active Browser Sessions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Active Web Sessions</h3>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAllSessions}
              className="h-7 text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
            >
              <LogOut className="size-3 mr-1" />
              <span>Revoke Other Sessions</span>
            </Button>
          )}
        </div>

        <div className="divide-y divide-border/60">
          {sessions.length > 0 ? (
            sessions.map((sess) => (
              <div key={sess.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {sess.browser_name || "Web Workspace Client"}
                    </span>
                    {sess.is_current && (
                      <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                        Current Session
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono block">
                    Device ID: {sess.device_id}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Last active: {new Date(sess.last_seen_at).toLocaleTimeString()}
                  </span>
                  {!sess.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Current browser session active.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

