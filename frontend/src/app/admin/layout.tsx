"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, isLoading, isAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Restore sidebar preference from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("codemate_admin_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("codemate_admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Auth & RBAC Check
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs font-mono uppercase tracking-widest">Verifying Admin Credentials...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    if (typeof window !== "undefined") {
      router.push("/login?redirect=/admin");
    }
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-card p-6 text-center shadow-lg space-y-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your account (<span className="font-mono text-foreground">{user?.email}</span>) does not possess administrative privileges.
              Administrative controls require server-verified <span className="font-semibold text-foreground">ADMIN</span> role.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="size-3.5" /> Return to Customer Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Persistent Left Sidebar */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader
          onMobileOpen={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <AdminCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}

