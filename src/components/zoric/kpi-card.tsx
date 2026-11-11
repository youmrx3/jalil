import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

export function ZoricKPI({
  label, value, trend, icon: Icon, spark, iconBg = "bg-orange-500/12 text-primary",
}: {
  label: string;
  value: string;
  trend?: { value: number; label: string };
  icon: LucideIcon;
  spark?: number[];
  iconBg?: string;
}) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <Card className="p-4 rounded-2xl border-border shadow-none hover:shadow-[0_8px_30px_-16px_rgba(16,24,40,0.28)] transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[13px] text-muted-foreground font-medium truncate">{label}</div>
      </div>

      <div className="text-[26px] leading-tight font-bold text-foreground mt-3 truncate tracking-tight">{value}</div>

      {trend && (
        <div className="flex items-center gap-1 mt-1.5 text-[12px]">
          <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}

      {spark && spark.length > 0 && (
        <div className="h-9 mt-3 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke="#FF5A1F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
