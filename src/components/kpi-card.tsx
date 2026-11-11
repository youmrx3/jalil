import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "accent" | "primary";
}) {
  const toneMap = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
    accent: "text-[color:var(--electric)]",
    primary: "gradient-text",
  };
  const iconBg = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    accent: "bg-[color:var(--electric)]/12 text-[color:var(--electric)]",
    primary: "bg-[color:var(--royal)]/12 text-[color:var(--royal)] dark:text-[color:var(--electric)]",
  };
  return (
    <Card className="kpi-premium overflow-hidden border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate font-medium">{label}</p>
            <p className={cn("mt-1.5 text-2xl font-bold truncate tracking-tight", toneMap[tone])}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground truncate">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn("rounded-lg p-2 shrink-0", iconBg[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
