"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Activity,
  Receipt,
  Laptop,
  LifeBuoy,
  Settings,
  Shield,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const CUSTOMER_NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Account & Activity",
    items: [
      { title: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
      { title: "Usage & Activity", href: "/dashboard/usage", icon: Activity },
      { title: "Billing History", href: "/dashboard/billing", icon: Receipt },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      { title: "Devices & Extension", href: "/dashboard/devices", icon: Laptop },
      { title: "Help & Support", href: "/dashboard/support", icon: LifeBuoy },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Profile & Preferences", href: "/dashboard/settings", icon: Settings },
      { title: "Security & Sessions", href: "/dashboard/security", icon: Shield },
    ],
  },
];

interface CustomerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CustomerSidebar({ isOpen, onClose }: CustomerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initial = (user?.display_name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-sm shadow-xs">
              <Terminal className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-foreground">CodeMate AI</span>
              <span className="text-[10px] text-muted-foreground font-mono">Developer Portal</span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {CUSTOMER_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                {section.title}
              </span>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-mono">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin Switcher Shortcut (Rendered only for verified ADMIN users) */}
          {isAdmin && (
            <div className="pt-2 border-t border-border/80">
              <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-amber-500 font-semibold">
                Administrative
              </span>
              <div className="pt-1">
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 shrink-0" />
                    <span>Admin Control Center</span>
                  </div>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account Footer */}
        <div className="p-3 border-t border-border bg-card/60">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 p-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-foreground truncate text-[11px]">
                  {user?.display_name || "Developer"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  {user?.email}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="size-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 shrink-0"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

