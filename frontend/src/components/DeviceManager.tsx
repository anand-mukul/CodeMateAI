"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Laptop, Smartphone, Trash2, RefreshCw, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { devicesApi, DeviceItem, parseErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export function DeviceManager() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await devicesApi.list();
      setDevices(data);
    } catch (err) {
      setError(parseErrorMessage(err, "Failed to load registered devices."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevoke = async (deviceId: string) => {
    if (!confirm("Are you sure you want to revoke this device? The extension on this browser will be signed out.")) {
      return;
    }
    try {
      setRevokingId(deviceId);
      await devicesApi.revoke(deviceId);
      toast.success("Device revoked successfully.");
      await loadDevices();
    } catch (err) {
      toast.error(parseErrorMessage(err, "Failed to revoke device."));
    } finally {
      setRevokingId(null);
    }
  };

  const activeDevices = devices.filter((d) => d.device_status === "active");

  return (
    <Card className="bg-zinc-950/80 border-white/[0.08]">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Authorized Hardware &amp; Extension Devices
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {activeDevices.length} Active
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage browser installations bound to your account. Revoking a device immediately invalidates its tokens.
            </p>
          </div>

          <button
            onClick={loadDevices}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/[0.08] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Device List Table */}
        <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 border-b border-white/[0.08] text-zinc-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Device / Client</th>
                <th className="py-3 px-4">Browser &amp; Version</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-zinc-300">
              {loading && devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Loading registered installations...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No devices registered yet. Open the Chrome Extension to bind this device.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const isRevoked = device.device_status === "revoked";
                  return (
                    <tr
                      key={device.id || device.device_id}
                      className={`hover:bg-white/[0.02] transition ${
                        isRevoked ? "opacity-50" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                            {device.device_id.startsWith("web_") ? (
                              <Laptop className="w-3.5 h-3.5" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {device.device_name || "Chrome Extension"}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              ID: {device.device_id.slice(0, 16)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {device.browser_name || "Chrome"} {device.browser_version || ""}
                        {device.extension_version && (
                          <span className="block text-[10px] text-zinc-500">
                            Ext v{device.extension_version}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isRevoked
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          }`}
                        >
                          {device.device_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {device.last_seen_at
                          ? new Date(device.last_seen_at).toLocaleDateString()
                          : "Recently"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isRevoked ? (
                          <button
                            onClick={() => handleRevoke(device.device_id)}
                            disabled={revokingId === device.device_id}
                            className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{revokingId === device.device_id ? "Revoking..." : "Revoke"}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-600">Revoked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 text-zinc-400 text-xs">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <p className="leading-relaxed text-[11px]">
            <strong>Automatic Slot Rotation:</strong> If you install CodeMate on a new browser after reaching your device limit, our engine automatically revokes the oldest inactive machine so you never get locked out.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

