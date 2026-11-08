"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Sun,
  Moon,
  Laptop,
  Bell,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";

interface AdminHeaderProps {
  onMobileOpen: () => void;
  onOpenCommand: () => void;
}

export function AdminHeader({
  onMobileOpen,
  onOpenCommand,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Generate readable breadcrumbs from path
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { href, label, isLast: idx === segments.length - 1 };
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMobileOpen}
          className="lg:hidden text-muted-foreground"
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </Button>

        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumbItems.map((item, idx) => (
            <React.Fragment key={item.href}>
              {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/40" />}
              {item.isLast ? (
                <span className="font-semibold text-foreground tracking-tight">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Global Search / Command trigger & Controls */}
      <div className="flex items-center gap-2">
        {/* Command Menu Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCommand}
          className="h-8 gap-2 px-2.5 sm:w-60 justify-between text-xs text-muted-foreground bg-muted/30 hover:bg-muted/60"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground/70" />
            <span className="hidden sm:inline">Search records...</span>
            <span className="sm:hidden">Search</span>
          </div>
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Theme Mode Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => setTheme("light")} className="text-xs cursor-pointer">
              <Sun className="mr-2 size-3.5" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="text-xs cursor-pointer">
              <Moon className="mr-2 size-3.5" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="text-xs cursor-pointer">
              <Laptop className="mr-2 size-3.5" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Global Security Role Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
          <Shield className="size-3" />
          <span>Admin Verified</span>
        </div>
      </div>
    </header>
  );
}

