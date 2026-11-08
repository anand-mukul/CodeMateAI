"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
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
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

interface AdminCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  title: string;
  section: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMAND_NAV_ITEMS: CommandItem[] = [
  { id: "dash", title: "Overview Dashboard", section: "Navigation", href: "/admin", icon: LayoutDashboard },
  { id: "users", title: "User Directory & Management", section: "Customers", href: "/admin/users", icon: Users },
  { id: "subs", title: "Active Subscriptions", section: "Customers", href: "/admin/subscriptions", icon: CreditCard },
  { id: "plans", title: "Subscription Plans & Pricing", section: "Customers", href: "/admin/plans", icon: Layers },
  { id: "coupons", title: "Promotional Coupons & Passes", section: "Customers", href: "/admin/coupons", icon: Tag },
  { id: "payments", title: "Razorpay Payments & Orders", section: "Revenue", href: "/admin/payments", icon: DollarSign },
  { id: "refunds", title: "Refund Reconciliation", section: "Revenue", href: "/admin/refunds", icon: RotateCcw },
  { id: "revenue", title: "Revenue & Financial Analytics", section: "Revenue", href: "/admin/revenue", icon: TrendingUp },
  { id: "ai_analytics", title: "AI Token & Cost Analytics", section: "AI Platform", href: "/admin/ai-analytics", icon: Cpu },
  { id: "ai_providers", title: "AI Providers & Dynamic Switching", section: "AI Platform", href: "/admin/ai-providers", icon: Sliders },
  { id: "prod_analytics", title: "Product & Extension Telemetry", section: "Product", href: "/admin/product-analytics", icon: BarChart3 },
  { id: "flags", title: "Feature Flags & Toggles", section: "Product", href: "/admin/feature-flags", icon: Flag },
  { id: "support", title: "Support Tickets & Helpdesk", section: "Operations", href: "/admin/support", icon: LifeBuoy },
  { id: "jobs", title: "Background Jobs & Aggregations", section: "Operations", href: "/admin/jobs", icon: Clock },
  { id: "health", title: "System Health & Probes", section: "Operations", href: "/admin/system-health", icon: Activity },
  { id: "audit", title: "Administrative Audit Trail", section: "Operations", href: "/admin/audit-logs", icon: ScrollText },
  { id: "settings", title: "Platform Settings & Policies", section: "Configuration", href: "/admin/settings", icon: Settings },
  { id: "portal", title: "Open Customer Portal", section: "Quick Action", href: "/dashboard", icon: ExternalLink },
];

export function AdminCommandMenu({ open, onOpenChange }: AdminCommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return COMMAND_NAV_ITEMS;
    const q = query.toLowerCase();
    return COMMAND_NAV_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    );
  }, [query]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Reset index when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: CommandItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-popover border-border shadow-2xl">
        <DialogTitle className="sr-only">Admin Command Menu</DialogTitle>
        <div className="flex items-center px-3.5 border-b border-border bg-muted/20">
          <Search className="size-4 shrink-0 text-muted-foreground mr-2.5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or jump to section..."
            className="h-12 border-0 bg-transparent text-sm focus-visible:ring-0 shadow-none px-0"
            autoFocus
          />
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching admin commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
                      isSelected
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={cn("size-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-mono">
                        {item.section}
                      </span>
                      <ArrowRight className={cn("size-3 opacity-0", isSelected && "opacity-100 text-primary")} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground bg-muted/30">
          <span>Navigate with ↑ / ↓, select with Enter</span>
          <span className="font-mono">CodeMate Admin v1.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

