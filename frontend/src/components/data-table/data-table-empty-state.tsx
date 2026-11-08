import { ReactNode } from "react";
import { FolderSearch, Inbox } from "lucide-react";

interface DataTableEmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function DataTableEmptyState({
  title = "No results found",
  description = "No records match your filter criteria or no data has been collected yet.",
  icon,
  action,
}: DataTableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3 border border-border/50">
        {icon || <Inbox className="size-6 opacity-60" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

