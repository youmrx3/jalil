import { useMemo, useState } from "react";
import { fmtDZD } from "@/lib/zoric/format";

export type OverviewOrder = {
  id: string; total: number | string; status: string; order_date: string;
  source?: string | null; created_at?: string; estimated_profit?: number | string;
  order_code?: string; customer_name?: string; wilaya?: string | null;
};

export const SOURCES: { key: string; label: string; color: string }[] = [
  { key: "meta", label: "Meta", color: "#FF5A1F" },
  { key: "tiktok", label: "TikTok", color: "#F5B33D" },
  { key: "organic", label: "Organique", color: "#9B958F" },
  { key: "manual", label: "Manuel", color: "#6AA9FF" },
];
export const sourceOf = (s?: string | null) => (s && SOURCES.some((x) => x.key === s) ? s : "manual");

export const isLive = (o: OverviewOrder) => o.status !== "cancelled" && o.status !== "returned";
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

/** Daily target: 30-day average daily takings + 15 %, rounded to 1 000 (min 1 000). */
export function dailyTarget(orders: OverviewOrder[]) {
  const since = iso(daysAgo(30));
  const sum = orders.filter((o) => isLive(o) && o.order_date >= since).reduce((s, o) => s + Number(o.total), 0);
  return Math.max(1000, Math.round(((sum / 30) * 1.15) / 1000) * 1000);
}

type Range = "14" | "30" | "13w";
const RANGES: { k: Range; label: string }[] = [{ k: "14", label: "14 jours" }, { k: "30", label: "30 jours" }, { k: "13w", label: "13 semaines" }];

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

export function TakingsChart({ orders, title = "Encaissements vs objectif" }: { orders: OverviewOrder[]; title?: string }) {
  const [range, setRange] = useState<Range>("14");
  const [channel, setChannel] = useState<string>("all");
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const live = orders.filter(isLive).filter((o) => channel === "all" || sourceOf(o.source) === channel);
    const perDay = new Map<string, number>();
    live.forEach((o) => perDay.set(o.order_date, (perDay.get(o.order_date) ?? 0) + Number(o.total)));
    const base = dailyTarget(orders);
    const share = channel === "all" ? 1 : Math.max(0.05, live.length / Math.max(1, orders.filter(isLive).length));
    let points: { label: string; sub: string; value: number; today: boolean }[] = [];
    let target = base * share;
    if (range === "13w") {
      target = target * 7;
      for (let w = 12; w >= 0; w--) {
        let v = 0;
        for (let d = 0; d < 7; d++) v += perDay.get(iso(daysAgo(w * 7 + d))) ?? 0;
        const start = daysAgo(w * 7 + 6);
        points.push({ label: start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), sub: "semaine", value: v, today: w === 0 });
      }
    } else {
      const n = Number(range);
      for (let i = n - 1; i >= 0; i--) {
        const d = daysAgo(i);
        points.push({
          label: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
          sub: d.toLocaleDateString("fr-FR", { day: "numeric" }),
          value: perDay.get(iso(d)) ?? 0,
          today: i === 0,
        });
      }
    }
    target = Math.round(target / 100) * 100;
    const total = points.reduce((s, p) => s + p.value, 0);
    const beat = points.filter((p) => p.value >= target).length;
    const best = points.reduce((b, p, i) => (p.value > (points[b]?.value ?? -1) ? i : b), 0);
    const max = Math.max(target * 1.3, ...points.map((p) => p.value), 1);
    const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
    const top = Math.ceil(max / step) * step;
    return { points, target, total, beat, best, top };
  }, [orders, range, channel]);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => model.top * t);
  const unit = range === "13w" ? "semaines" : "jours";

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Chaque vente, chaque canal — orange quand la période dépasse l'objectif</p>
        </div>
        <div className="ml-auto flex rounded-xl border border-border bg-surface-2 p-0.5">
          {RANGES.map((r) => (
            <button key={r.k} onClick={() => setRange(r.k)}
              className={`h-7 px-3 rounded-[9px] text-[12px] font-medium transition ${range === r.k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-[11.5px] text-muted-foreground">Encaissé</div>
          <div className="text-[30px] font-bold tracking-tight text-foreground tabular leading-tight">{fmtDZD(model.total)}</div>
        </div>
        <Stat label="Objectif atteint" value={<>{model.beat} <span className="text-muted-foreground font-medium text-[12px]">sur {model.points.length} {unit}</span></>} />
        <Stat label={<span className="inline-flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-primary" /> Objectif</span>} value={<>{fmtDZD(model.target)} <span className="text-muted-foreground font-medium text-[12px]">/ {range === "13w" ? "semaine" : "jour"}</span></>} />
        <Stat label="Meilleur" value={<>{fmtDZD(model.points[model.best]?.value ?? 0)} <span className="text-muted-foreground font-medium text-[12px]">{model.points[model.best]?.label} {model.points[model.best]?.sub}</span></>} />
        <div className="ml-auto flex flex-wrap gap-1.5">
          {[{ key: "all", label: "Tous", color: "" }, ...SOURCES].map((s) => (
            <button key={s.key} onClick={() => setChannel(s.key)}
              className={`h-7 px-2.5 rounded-lg border text-[11.5px] font-medium inline-flex items-center gap-1.5 transition ${channel === s.key ? "bg-primary border-primary text-white" : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"}`}>
              {s.color && <span className="h-2 w-2 rounded-[3px]" style={{ background: channel === s.key ? "#fff" : s.color }} />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plot */}
      <div className="mt-5 flex gap-2">
        <div className="relative w-10 shrink-0 h-[260px] text-[10.5px] text-muted-foreground tabular">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / model.top) * 100}%`, transform: "translateY(50%)" }}>{compact(t)}</span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="relative h-[260px]">
            {ticks.map((t) => (
              <div key={t} className="absolute left-0 right-0 border-t border-border/60" style={{ bottom: `${(t / model.top) * 100}%` }} />
            ))}
            {/* target line */}
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-primary/70 z-10" style={{ bottom: `${(model.target / model.top) * 100}%` }}>
              <span className="absolute -left-1 -translate-x-full -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-bold tabular">{compact(model.target)}</span>
            </div>
            <div className="absolute inset-0 flex">
              {model.points.map((p, i) => {
                const h = (p.value / model.top) * 100;
                const hit = p.value >= model.target;
                const color = p.today ? "bg-foreground" : hit ? "bg-primary" : "bg-muted-foreground/45";
                return (
                  <div key={i} className="relative flex-1 flex justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    {hover === i && <div className="absolute inset-y-0 w-full max-w-10 rounded-lg bg-foreground/[0.04]" />}
                    <div className="absolute bottom-0 flex flex-col items-center origin-bottom" style={{ height: `${Math.max(h, 1.5)}%`, animation: `ember-rise .7s cubic-bezier(.2,.7,.2,1) ${i * 30}ms both` }}>
                      <span className={`h-3 w-3 rounded-full ${color} ${hit && !p.today ? "shadow-[0_0_14px_rgba(255,90,31,0.85)]" : ""} ring-4 ring-card shrink-0 -mb-1.5 z-10`} />
                      <span className={`w-[3px] flex-1 rounded-full ${hit && !p.today ? "bg-gradient-to-b from-primary to-primary/30" : p.today ? "bg-foreground/70" : "bg-muted-foreground/30"}`} />
                    </div>
                    {hover === i && (
                      <div className="absolute z-20 -translate-y-full px-2.5 py-1.5 rounded-lg bg-popover border border-border text-[11px] whitespace-nowrap shadow-xl" style={{ bottom: `calc(${Math.max(h, 1.5)}% + 14px)` }}>
                        <div className="text-muted-foreground">{p.label} {p.sub}</div>
                        <div className="font-bold text-foreground tabular">{fmtDZD(p.value)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex mt-2">
            {model.points.map((p, i) => (
              <div key={i} className={`flex-1 text-center text-[10.5px] leading-tight capitalize ${p.today ? "text-primary font-semibold" : "text-muted-foreground"} ${model.points.length > 16 && i % 2 ? "invisible sm:visible" : ""}`}>
                <div className="truncate">{p.label}</div>
                {model.points.length <= 16 && <div className="tabular">{p.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="text-[15px] font-semibold text-foreground tabular mt-0.5">{value}</div>
    </div>
  );
}
