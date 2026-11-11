import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const CHART_COLORS = {
  navy: "#1e3a8a",
  royal: "#2563eb",
  blue: "#3b82f6",
  sky: "#60a5fa",
  light: "#93c5fd",
  glow: "#bfdbfe",
  danger: "#ef4444",
  amber: "#f59e0b",
  emerald: "#10b981",
};

export const PIE_PALETTE = [
  CHART_COLORS.royal,
  CHART_COLORS.sky,
  CHART_COLORS.navy,
  CHART_COLORS.light,
  CHART_COLORS.blue,
  CHART_COLORS.glow,
];

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  height = "h-72",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <Card className={cn("border-border/60 overflow-hidden", className)} style={{ background: "var(--gradient-card)" }}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn(height, "pt-0")}>{children}</CardContent>
    </Card>
  );
}
