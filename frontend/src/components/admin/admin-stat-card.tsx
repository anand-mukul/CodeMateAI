import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "cn";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  change?: number; // percentage change e.g. +12.4
  changeLabel?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  change,
  changeLabel = "vs last month",
  icon,
  subtitle,
  className,
}: AdminStatCardProps) {
  const isPositive = typeof change === "number" && change > 0;
  const isNegative = typeof change === "number" && change < 0;
  const isNeutral = typeof change === "number" && change === 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-2xs hover:border-border/80 transition-colors flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{title}</span>
        {icon && <div className="text-muted-foreground/80">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
          {value}
        </span>
      </div>

      {(typeof change === "number" || subtitle) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {typeof change === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                isPositive && "text-emerald-500",
                isNegative && "text-rose-500",
                isNeutral && "text-muted-foreground"
              )}
            >
              {isPositive && <ArrowUp className="size-3" />}
              {isNegative && <ArrowDown className="size-3" />}
              {isNeutral && <Minus className="size-3" />}
              {Math.abs(change)}%
            </span>
          )}
          <span>{subtitle || changeLabel}</span>
        </div>
      )}
    </div>
  );
}

