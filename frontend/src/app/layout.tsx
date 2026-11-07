import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CodeMate — The Intelligent Coding Platform",
  description: "Modern coding companion for automated problem comprehension, progressive multi-file code completion, and cloud telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <AuthProvider>
          <TooltipProvider delay={150}>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
