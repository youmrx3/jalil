import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ZoricShell, useOverview } from "@/components/zoric/shell";
import { TakingsChart, SOURCES, sourceOf, isLive, iso, daysAgo, type OverviewOrder } from "@/components/zoric/takings-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fmtDZD, fmtNum } from "@/lib/zoric/format";
import { exportCSV } from "@/lib/zoric/csv";

export const Route = createFileRoute("/_authenticated/zoric/ventes")({
  head: () => ({ meta: [{ title: "Ventes — Zoric" }, { name: "description", content: "Encaissements, canaux et meilleures ventes." }] }),
  component: SalesPage,
});

type Tab = "takings" | "channels" | "best";
const TABS: { k: Tab; label: string }[] = [{ k: "takings", label: "Encaissements" }, { k: "channels", label: "Canaux" }, { k: "best", label: "Meilleures ventes" }];

function SalesPage() {
  const { data, isLoading } = useOverview();
  const [tab, setTab] = useState<Tab>("takings");
  const orders = (data?.orders ?? []) as OverviewOrder[];

  const csv = () => exportCSV("ventes.csv", orders.filter(isLive).map((o) => ({
    date: o.order_date, commande: o.order_code ?? "", client: o.customer_name ?? "", canal: sourceOf(o.source), total: Number(o.total),
  })));

  return (
    <ZoricShell
      title="Ventes"
      subtitle={`Ce que ${data?.storeName ?? "votre boutique"} a vendu, d'où ça vient, et quoi`}
      actions={<Button variant="outline" className="rounded-xl" onClick={csv}><Download className="h-4 w-4 mr-1.5" /> Exporter CSV</Button>}
    >
      <div className="flex items-center gap-6 border-b border-border mb-5 text-[13px]">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`relative pb-3 font-medium transition ${tab === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
            {tab === t.k && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {isLoading || !data ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div key={tab} className="animate-fade-up">
          {tab === "takings" && <TakingsTab orders={orders} />}
          {tab === "channels" && <ChannelsTab orders={orders} />}
          {tab === "best" && <BestTab items={data.items} orders={orders} />}
        </div>
      )}
    </ZoricShell>
  );
}

function TakingsTab({ orders }: { orders: OverviewOrder[] }) {
  const { heat, days } = useMemo(() => {
    const live = orders.filter(isLive);
    // when people buy: weekday × 3-hour slot (last 30 days)
    const since = iso(daysAgo(30));
    const grid = Array.from({ length: 7 }, () => Array(8).fill(0) as number[]);
    live.filter((o) => o.order_date >= since && o.created_at).forEach((o) => {
      const d = new Date(o.created_at!);
      grid[(d.getDay() + 6) % 7]![Math.floor(d.getHours() / 3)]! += 1;
    });
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = iso(daysAgo(i));
      const l = live.filter((o) => o.order_date === d);
      const t = l.reduce((s, o) => s + Number(o.total), 0);
      return { d, n: l.length, t, avg: l.length ? t / l.length : 0 };
    });
    return { heat: grid, days };
  }, [orders]);
  const max = Math.max(1, ...heat.flat());
  const DAY = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-4">
      <TakingsChart orders={orders} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="panel p-5">
          <h3 className="text-[15px] font-semibold text-foreground">Quand les clients achètent</h3>
          <p className="text-[12px] text-muted-foreground">Commandes par jour et créneau — 30 derniers jours</p>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="grid grid-cols-[40px_repeat(8,1fr)] gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                <span />{Array.from({ length: 8 }, (_, i) => <span key={i} className="text-center">{String(i * 3).padStart(2, "0")}h</span>)}
              </div>
              {heat.map((row, r) => (
                <div key={r} className="grid grid-cols-[40px_repeat(8,1fr)] gap-1.5 mb-1.5">
                  <span className="text-[11px] text-muted-foreground self-center">{DAY[r]}</span>
                  {row.map((v, c) => (
                    <div key={c} title={`${v} commandes`} className="h-8 rounded-lg border border-border"
                      style={{ background: v ? `rgba(255,90,31,${0.12 + (v / max) * 0.88})` : "var(--surface-2)" }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[15px] font-semibold text-foreground">Jour par jour</h3>
            <p className="text-[12px] text-muted-foreground">14 derniers jours</p>
          </div>
          <div className="text-[12.5px]">
            <div className="grid grid-cols-4 px-5 py-2 text-muted-foreground border-y border-border bg-surface-2/50">
              <span>Jour</span><span className="text-right">Commandes</span><span className="text-right">Panier</span><span className="text-right">Encaissé</span>
            </div>
            <div className="max-h-[330px] overflow-y-auto divide-y divide-border">
              {days.map((d) => (
                <div key={d.d} className="grid grid-cols-4 px-5 py-2.5 tabular">
                  <span className="text-foreground capitalize">{new Date(d.d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="text-right text-muted-foreground">{d.n}</span>
                  <span className="text-right text-muted-foreground">{fmtDZD(d.avg)}</span>
                  <span className="text-right font-semibold text-foreground">{fmtDZD(d.t)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelsTab({ orders }: { orders: OverviewOrder[] }) {
  const [sel, setSel] = useState("meta");
  const m = useMemo(() => {
    const now = new Date();
    const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    const prevStart = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevSame = iso(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
    const live = orders.filter(isLive);
    const cur = live.filter((o) => o.order_date >= monthStart);
    const prev = live.filter((o) => o.order_date >= prevStart && o.order_date <= prevSame);
    const sum = (l: OverviewOrder[]) => l.reduce((s, o) => s + Number(o.total), 0);
    const total = sum(cur);
    const rows = SOURCES.map((s) => {
      const c = cur.filter((o) => sourceOf(o.source) === s.key), p = prev.filter((o) => sourceOf(o.source) === s.key);
      const v = sum(c), pv = sum(p);
      return { ...s, value: v, prev: pv, count: c.length, share: total ? (v / total) * 100 : 0, delta: pv ? ((v - pv) / pv) * 100 : v ? 100 : 0 };
    });
    const series = Array.from({ length: 30 }, (_, i) => {
      const d = iso(daysAgo(29 - i));
      const row: Record<string, number | string> = { day: new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) };
      SOURCES.forEach((s) => { row[s.key] = sum(live.filter((o) => o.order_date === d && sourceOf(o.source) === s.key)); });
      return row;
    });
    return { rows, total, series, prevTotal: sum(prev), curCount: cur.length, prevCount: prev.length };
  }, [orders]);
  const month = new Date().toLocaleDateString("fr-FR", { month: "long" });
  const maxBar = Math.max(1, ...m.rows.flatMap((r) => [r.value, r.prev]));

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h3 className="text-[15px] font-semibold text-foreground">D'où vient <span className="capitalize">{month}</span></h3>
        <p className="text-[12px] text-muted-foreground">{fmtDZD(m.total)} sur {SOURCES.length} canaux</p>
        <div className="flex gap-1.5 h-2.5 mt-4">
          {m.rows.filter((r) => r.value > 0).map((r) => <div key={r.key} className="rounded-full transition-all" style={{ flex: r.value, background: r.color }} />)}
          {m.total === 0 && <div className="flex-1 rounded-full bg-muted" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {m.rows.map((r) => (
            <button key={r.key} onClick={() => setSel(r.key)}
              className={`text-left rounded-2xl border p-4 transition ${sel === r.key ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--ember)]" : "border-border bg-surface-2 hover:border-input"}`}>
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: r.color }} />{r.label}</div>
              <div className="text-[22px] font-bold text-foreground tabular mt-2">{fmtDZD(r.value)}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded-md font-semibold ${r.delta >= 0 ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>{r.delta >= 0 ? "+" : ""}{r.delta.toFixed(0)}%</span>
                <span className="text-muted-foreground">{r.share.toFixed(0)}% des ventes</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="panel p-5 xl:col-span-2">
          <div className="flex flex-wrap items-start gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">{SOURCES.find((s) => s.key === sel)?.label}, 30 jours</h3>
              <p className="text-[12px] text-muted-foreground">Choisissez un canal ci-dessus ou ici — la courbe suit</p>
            </div>
            <div className="ml-auto flex rounded-xl border border-border bg-surface-2 p-0.5">
              {SOURCES.map((s) => (
                <button key={s.key} onClick={() => setSel(s.key)} className={`h-7 px-3 rounded-[9px] text-[12px] font-medium ${sel === s.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.series}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" fontSize={10.5} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} interval={3} />
                <YAxis fontSize={10.5} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
                <Tooltip formatter={(v: number) => fmtDZD(v)} />
                {SOURCES.filter((s) => s.key !== sel).map((s) => <Line key={s.key} type="monotone" dataKey={s.key} stroke="var(--muted-foreground)" strokeOpacity={0.25} strokeWidth={1.5} dot={false} />)}
                <Line type="monotone" dataKey={sel} stroke={SOURCES.find((s) => s.key === sel)?.color} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="text-[15px] font-semibold text-foreground">Ce mois vs le mois dernier</h3>
          <p className="text-[12px] text-muted-foreground">Mêmes jours écoulés — gris = mois dernier</p>
          <div className="space-y-4 mt-5">
            {m.rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[84px_1fr_64px] items-center gap-3 text-[12px]">
                <span className="text-foreground">{r.label}</span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full" style={{ width: `${(r.value / maxBar) * 100}%`, background: r.color, minWidth: 4 }} />
                  <div className="h-2 rounded-full bg-muted-foreground/30" style={{ width: `${(r.prev / maxBar) * 100}%`, minWidth: 4 }} />
                </div>
                <span className="text-right font-semibold text-foreground tabular">{Math.round(r.value / 1000)}k</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border space-y-2 text-[12.5px]">
            <Row label="Commandes" a={fmtNum(m.curCount)} b={fmtNum(m.prevCount)} />
            <Row label="Encaissé" a={fmtDZD(m.total)} b={fmtDZD(m.prevTotal)} />
            <Row label="Panier moyen" a={fmtDZD(m.curCount ? m.total / m.curCount : 0)} b={fmtDZD(m.prevCount ? m.prevTotal / m.prevCount : 0)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="flex items-center gap-2 tabular">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold text-foreground">{a}</span>
      <span className="text-muted-foreground w-24 text-right">{b}</span>
    </div>
  );
}

function BestTab({ items, orders }: { items: { order_id: string; product_name: string; quantity: number; unit_price: number | string }[]; orders: OverviewOrder[] }) {
  const rows = useMemo(() => {
    const liveIds = new Set(orders.filter(isLive).map((o) => o.id));
    const since = iso(daysAgo(30));
    const recentIds = new Set(orders.filter((o) => isLive(o) && o.order_date >= since).map((o) => o.id));
    const map = new Map<string, { name: string; qty: number; rev: number; recent: number }>();
    items.filter((i) => liveIds.has(i.order_id)).forEach((i) => {
      const r = map.get(i.product_name) ?? { name: i.product_name, qty: 0, rev: 0, recent: 0 };
      r.qty += Number(i.quantity); r.rev += Number(i.quantity) * Number(i.unit_price);
      if (recentIds.has(i.order_id)) r.recent += Number(i.quantity);
      map.set(i.product_name, r);
    });
    return [...map.values()].sort((a, b) => b.rev - a.rev);
  }, [items, orders]);
  const max = Math.max(1, ...rows.map((r) => r.rev));
  const total = rows.reduce((s, r) => s + r.rev, 0);

  if (rows.length === 0) return <div className="panel p-10 text-center text-sm text-muted-foreground">Pas encore de ventes.</div>;

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-[32px_1fr_80px_80px_140px] gap-3 px-5 py-3 text-[12px] text-muted-foreground border-b border-border">
        <span>#</span><span>Produit</span><span className="text-right">Unités</span><span className="text-right hidden sm:block">30 j</span><span className="text-right">Chiffre</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r, i) => (
          <div key={r.name} className="grid grid-cols-[32px_1fr_80px_80px_140px] gap-3 items-center px-5 py-3 text-[13px] tabular hover:bg-surface-2/60">
            <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${i < 3 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{r.name}</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-ember-gradient" style={{ width: `${(r.rev / max) * 100}%` }} /></div>
            </div>
            <span className="text-right text-foreground">{fmtNum(r.qty)}</span>
            <span className="text-right text-muted-foreground hidden sm:block">{fmtNum(r.recent)}</span>
            <div className="text-right">
              <div className="font-semibold text-foreground">{fmtDZD(r.rev)}</div>
              <div className="text-[11px] text-muted-foreground">{((r.rev / Math.max(1, total)) * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
