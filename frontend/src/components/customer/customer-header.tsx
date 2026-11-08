"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Moon,
  Sun,
  Laptop,
  Terminal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

interface CustomerHeaderProps {
  onToggleSidebar?: () => void;
}

export function CustomerHeader({ onToggleSidebar }: CustomerHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname === "/dashboard/subscription") return "Subscription & Quotas";
    if (pathname === "/dashboard/usage") return "Usage & Activity";
    if (pathname === "/dashboard/billing") return "Billing History";
    if (pathname === "/dashboard/devices") return "Connected Devices";
    if (pathname.startsWith("/dashboard/support")) return "Customer Support";
    if (pathname === "/dashboard/settings") return "Profile & Preferences";
    if (pathname === "/dashboard/security") return "Security & Sessions";
    return "Dashboard";
  };

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="size-8 md:hidden text-muted-foreground"
        >
          <Menu className="size-4" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Portal
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{getBreadcrumb()}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Chrome Extension Shortcut */}
        <Link
          href="/dashboard/devices"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Laptop className="size-3.5 text-primary" />
          <span>Extension</span>
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </Link>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="size-8 text-muted-foreground hover:text-foreground"
          title="Toggle color theme"
        >
          {mounted && theme === "dark" ? (
            <Sun className="size-4 text-amber-400" />
          ) : (
            <Moon className="size-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Account Plan Badge */}
        <Badge variant="outline" className="font-mono text-[10px] hidden md:inline-flex">
          {user?.email_verified ? "VERIFIED DEVELOPER" : "DEVELOPER"}
        </Badge>
      </div>
    </header>
  );
}

