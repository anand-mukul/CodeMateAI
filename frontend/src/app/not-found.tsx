import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold font-mono tracking-tight text-white mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-zinc-400 max-w-md mb-8">
        The requested resource or page does not exist or has been moved to another location.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors"
        >
          Home Page
        </Link>
      </div>
    </div>
  );
}

