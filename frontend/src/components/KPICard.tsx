import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: number; // 0 to 100
  badge?: {
    text: string;
    variant?: "default" | "success" | "warning" | "indigo";
  };
  onClick?: () => void;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  progress,
  badge,
  onClick,
  className,
}: KPICardProps) {
  const badgeColors = {
    default: "bg-white/[0.08] text-zinc-300 border-white/[0.1]",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden bg-zinc-950/70 border-white/[0.08] transition-all duration-200 hover:border-white/[0.18]",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">{title}</span>
          {badge && (
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                badgeColors[badge.variant || "default"]
              )}
            >
              {badge.text}
            </span>
          )}
          {!badge && icon && <div className="text-zinc-400">{icon}</div>}
        </div>

        <div>
          <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
          {progress !== undefined && (
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>

        {subtitle && (
          <span className="text-[11px] text-zinc-500 leading-tight">{subtitle}</span>
        )}
      </CardContent>
    </Card>
  );
}

