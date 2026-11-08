"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  Tag,
  DollarSign,
  RotateCcw,
  TrendingUp,
  Cpu,
  Sliders,
  BarChart3,
  Flag,
  LifeBuoy,
  Clock,
  Activity,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";

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

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Customers",
    items: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { title: "Plans", href: "/admin/plans", icon: Layers },
      { title: "Coupons", href: "/admin/coupons", icon: Tag },
    ],
  },
  {
    title: "Revenue",
    items: [
      { title: "Payments", href: "/admin/payments", icon: DollarSign },
      { title: "Refunds", href: "/admin/refunds", icon: RotateCcw },
      { title: "Revenue Analytics", href: "/admin/revenue", icon: TrendingUp },
    ],
  },
  {
    title: "AI Platform",
    items: [
      { title: "AI Analytics", href: "/admin/ai-analytics", icon: Cpu },
      { title: "AI Providers", href: "/admin/ai-providers", icon: Sliders },
    ],
  },
  {
    title: "Product",
    items: [
      { title: "Product Analytics", href: "/admin/product-analytics", icon: BarChart3 },
      { title: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Support", href: "/admin/support", icon: LifeBuoy },
      { title: "Background Jobs", href: "/admin/jobs", icon: Clock },
      { title: "System Health", href: "/admin/system-health", icon: Activity },
      { title: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
    ],
  },
  {
    title: "Configuration",
    items: [
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-hidden bg-card border-r border-border">
      {/* Header / Brand */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-border/80">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-xs">
            <Code2 className="size-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-foreground">CodeMate</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Admin Control</span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          className="hidden lg:flex text-muted-foreground hover:text-foreground"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </Button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h4>
            )}
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          onClick={onMobileClose}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-xl transition-colors mx-auto",
                            active
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer / Account */}
      <div className="border-t border-border p-2 space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            isCollapsed && "justify-center px-0"
          )}
        >
          <ExternalLink className="size-3.5 shrink-0" />
          {!isCollapsed && <span>Customer Portal</span>}
        </Link>
        <div
          className={cn(
            "flex items-center justify-between rounded-xl p-2 bg-muted/40",
            isCollapsed && "flex-col p-1.5 gap-2"
          )}
        >
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-foreground truncate">
                {user?.display_name || user?.email?.split("@")[0] || "Administrator"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => logout()}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Log out"
              >
                <LogOut className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-200 z-30",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("fixed top-0 bottom-0 z-30", isCollapsed ? "w-16" : "w-60")}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in-0 duration-150"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

