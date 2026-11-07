"use client";

import React from "react";
import {
  LayoutDashboard,
  KeyRound,
  Laptop,
  CreditCard,
  Settings,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type TabKey =
  | "overview"
  | "sync"
  | "devices"
  | "billing"
  | "settings"
  | "admin"
  | "support";

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  className?: string;
}

export function AppSidebar({ activeTab, onSelectTab, className }: SidebarProps) {
  const { user, isAdmin, isSupport, logout, resendVerification } = useAuth();
  const [verifying, setVerifying] = React.useState(false);

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      key: "sync",
      label: "Extension Sync",
      icon: <KeyRound className="w-4 h-4" />,
    },
    {
      key: "devices",
      label: "Authorized Devices",
      icon: <Laptop className="w-4 h-4" />,
    },
    {
      key: "billing",
      label: "Plans & Billing",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleResend = async () => {
    try {
      setVerifying(true);
      await resendVerification();
      toast.success("Verification email sent! Please check your inbox.");
    } catch {
      toast.error("Failed to resend verification email.");
    } finally {
      setVerifying(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return (email || "U").slice(0, 1).toUpperCase();
  };

  return (
    <ShadcnSidebar
      className={cn(
        "border-r border-white/[0.08] bg-zinc-950 text-zinc-100",
        className
      )}
    >
      {/* Brand Header */}
      <SidebarHeader className="h-16 px-5 border-b border-white/[0.08] flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">CodeMate</span>
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">Workspace</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2 space-y-4">
        {/* User Card */}
        {user && (
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center text-xs font-bold border border-white/10 shrink-0">
                {getInitials(user.display_name, user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {user.display_name || "Developer"}
                  </p>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/[0.08] text-zinc-400 border border-white/[0.08] uppercase">
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate font-mono">{user.email}</p>
              </div>
            </div>

            {/* Email Verification status pill */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              {user.email_verified ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 text-amber-400 text-[11px]">
                    <AlertCircle className="w-3 h-3" />
                    <span>Unverified</span>
                  </div>
                  <button
                    onClick={handleResend}
                    disabled={verifying}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer"
                  >
                    {verifying ? "Sending..." : "Resend Link"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Group */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSelectTab(item.key)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer",
                        isActive
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className={cn(isActive ? "text-indigo-400" : "text-zinc-400")}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support Group */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
            Help &amp; Triage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "support"}
                  onClick={() => onSelectTab("support")}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer",
                    activeTab === "support"
                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span className={cn(activeTab === "support" ? "text-indigo-400" : "text-zinc-400")}>
                    <LifeBuoy className="w-4 h-4" />
                  </span>
                  <span>Support Desk</span>
                  {isSupport && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      Staff
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Governance (Role-Gated) */}
        {isAdmin && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">
              Governance
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === "admin"}
                    onClick={() => onSelectTab("admin")}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer",
                      activeTab === "admin"
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    )}
                  >
                    <span className={cn(activeTab === "admin" ? "text-purple-400" : "text-zinc-400")}>
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span>Admin Console</span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-semibold">
                      ROOT
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer / Sign Out */}
      <SidebarFooter className="p-3 border-t border-white/[0.08]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}

// Keep export alias for backwards compatibility
export { AppSidebar as Sidebar };
