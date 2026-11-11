import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import {
  ShoppingBag, ShoppingBasket, Undo2, Wallet, ArrowUpRight, Plus, FileBarChart2,
  AlertTriangle, PhoneCall, Truck, Package as PackageIcon, Sparkles, Loader2,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, Tooltip } from "recharts";
import { toast } from "sonner";
import { ZoricShell, StatusPill, useOverview } from "@/components/zoric/shell";
import { TakingsChart, dailyTarget, isLive, iso, daysAgo } from "@/components/zoric/takings-chart";
import { timeAgo } from "@/components/zoric/dispatch-board";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/lib/zoric/queries.functions";
import { fmtDZD, fmtNum, STATUS_LABELS, STATUS_COLORS } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/")({
  head: () => ({
    meta: [
      { title: "Vue d'ensemble — Zoric" },
      { name: "description", content: "Vue en temps réel des performances de votre boutique COD." },
    ],
  }),
  component: DashboardPage,
});

const pctChange = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

function DashboardPage() {
  const { data, isLoading } = useOverview();
  const qc = useQueryClient();
  const seed = useServerFn(seedDemoData);
  const seedMut = useMutation({
    mutationFn: () => seed(),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(r.inserted ? "Données de démo chargées" : "Votre boutique contient déjà des commandes");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = useMemo(() => {
    if (!data) return null;
    const orders = data.orders;
    const today = iso(new Date());
    const now = new Date();
    const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    const prevMonthStart = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevMonthSameDay = iso(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
    const live = orders.filter(isLive);

    const monthTakings = live.filter((o) => o.order_date >= monthStart).reduce((t, o) => t + Number(o.total), 0);
    const prevTakings = live.filter((o) => o.order_date >= prevMonthStart && o.order_date <= prevMonthSameDay).reduce((t, o) => t + Number(o.total), 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthTarget = dailyTarget(orders) * daysInMonth;
    const projected = (monthTakings / Math.max(1, now.getDate())) * daysInMonth;

    // 7-day windows for the small KPI cards
    const w = (from: number, to: number) => orders.filter((o) => o.order_date > iso(daysAgo(from)) && o.order_date <= iso(daysAgo(to)));
    const cur = w(7, 0), prev = w(14, 7);
    const basket = (l: typeof orders) => { const v = l.filter(isLive); return v.length ? v.reduce((t, o) => t + Number(o.total), 0) / v.length : 0; };
    const retRate = (l: typeof orders) => (l.length ? (l.filter((o) => o.status === "returned").length / l.length) * 100 : 0);

    const spark = (fn: (l: typeof orders) => number) =>
      Array.from({ length: 14 }, (_, i) => ({ v: fn(orders.filter((o) => o.order_date === iso(daysAgo(13 - i)))) }));

    // money
    const deliveredProfit = orders.filter((o) => o.status === "delivered" && o.order_date >= monthStart).reduce((t, o) => t + Number(o.estimated_profit), 0);
    const adSpend = data.adMetrics.filter((m) => m.metric_date >= monthStart).reduce((t, m) => t + Number(m.spend), 0);
    const expenses = data.expenses.filter((e) => e.expense_date >= monthStart).reduce((t, e) => t + Number(e.amount), 0);
    const onTheRoad = orders.filter((o) => ["shipped", "in_delivery"].includes(o.status)).reduce((t, o) => t + Number(o.total), 0);
    const pending = orders.filter((o) => ["new", "to_confirm", "confirmed", "prepared"].includes(o.status)).reduce((t, o) => t + Number(o.total), 0);
    const net = deliveredProfit - adSpend - expenses;
    const netSeries = Array.from({ length: 30 }, (_, i) => {
      const d = iso(daysAgo(29 - i));
      return { v: orders.filter((o) => o.status === "delivered" && o.order_date <= d && o.order_date >= iso(daysAgo(29))).reduce((t, o) => t + Number(o.estimated_profit), 0) };
    });

    const byStatus = (k: string) => orders.filter((o) => o.status === k).length;
    const lowStock = data.inventory.filter((i) => Number(i.available) <= Number(i.reorder_level)).length;
    const todayOrders = live.filter((o) => o.order_date === today);

    return {
      monthTakings, monthDelta: pctChange(monthTakings, prevTakings), monthTarget, projected,
      orders7: cur.length, ordersDelta: pctChange(cur.length, prev.length),
      basket7: basket(cur), basketDelta: pctChange(basket(cur), basket(prev)),
      ret7: retRate(cur), retDelta: retRate(cur) - retRate(prev),
      sparkOrders: spark((l) => l.length), sparkBasket: spark(basket), sparkRet: spark(retRate),
      net, deliveredProfit, adSpend, expenses, onTheRoad, pending, netSeries,
      toConfirm: byStatus("to_confirm") + byStatus("new"), inDelivery: byStatus("in_delivery"),
      returned: byStatus("returned"), cancelled: byStatus("cancelled"), lowStock,
      todayCount: todayOrders.length, todayTakings: todayOrders.reduce((t, o) => t + Number(o.total), 0),
      recent: [...orders].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 7),
      daysLeft: daysInMonth - now.getDate(),
    };
  }, [data]);

  const monthName = new Date().toLocaleDateString("fr-FR", { month: "long" });
  const empty = data && data.orders.length === 0;

  return (
    <ZoricShell
      eyebrow={greeting()}
      title={`${data?.storeName ?? "Ma boutique"} aujourd'hui`}
      subtitle={s ? `${fmtDZD(s.todayTakings)} encaissés sur ${s.todayCount} commandes depuis minuit · ${s.toConfirm} à confirmer · ${s.lowStock} produits en stock faible` : "Chargement de vos chiffres…"}
      actions={<>
        <Button asChild variant="outline" className="rounded-xl"><Link to="/zoric/rapports"><FileBarChart2 className="h-4 w-4 mr-1.5" /> Rapport des ventes</Link></Button>
        <Button asChild className="rounded-xl bg-ember-gradient text-white hover:opacity-95"><Link to="/zoric/commandes" search={{ new: 1 }}><Plus className="h-4 w-4 mr-1" /> Nouvelle commande</Link></Button>
      </>}
    >
      {isLoading || !s ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          <Skeleton className="h-96 rounded-2xl xl:col-span-3" /><Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          {empty && (
            <div className="panel p-6 mb-5 flex flex-col md:flex-row md:items-center gap-4 animate-fade-up">
              <div className="h-12 w-12 rounded-2xl bg-ember-gradient flex items-center justify-center text-white shrink-0"><Sparkles className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-foreground">Votre boutique est prête</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">Ajoutez vos produits et vos premières commandes — ou explorez l'outil avec des données de démonstration (supprimables à tout moment dans Paramètres).</p>
              </div>
              <div className="md:ml-auto flex gap-2 shrink-0">
                <Button variant="outline" className="rounded-xl" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                  {seedMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Charger la démo
                </Button>
                <Button asChild className="rounded-xl bg-ember-gradient text-white"><Link to="/zoric/produits">Ajouter un produit</Link></Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* KPI row */}
            <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-[18px] bg-ember-gradient p-4 text-white shadow-[0_24px_48px_-24px_rgba(255,90,31,0.9)] animate-fade-up flex flex-col">
                <div className="flex items-center gap-2 text-[12px] font-medium text-white/85">
                  <span className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center"><Wallet className="h-3.5 w-3.5" /></span>
                  Encaissé · <span className="capitalize">{monthName}</span>
                </div>
                <div className="text-[28px] font-bold tracking-tight mt-3 tabular leading-none">{fmtDZD(s.monthTakings)}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 font-semibold">{s.monthDelta >= 0 ? "+" : ""}{s.monthDelta.toFixed(1)}%</span>
                  <span className="text-white/80 truncate">{Math.round((s.monthTakings / s.monthTarget) * 100)}% de {fmtDZD(s.monthTarget)}</span>
                </div>
                <div className="mt-auto pt-3"><div className="h-1.5 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (s.monthTakings / s.monthTarget) * 100)}%` }} /></div></div>
              </div>
              <MiniKPI icon={ShoppingBag} label="Commandes · 7 j" value={fmtNum(s.orders7)} delta={s.ordersDelta} spark={s.sparkOrders} delay={60} />
              <MiniKPI icon={ShoppingBasket} label="Panier moyen" value={fmtDZD(s.basket7)} delta={s.basketDelta} spark={s.sparkBasket} delay={120} />
              <MiniKPI icon={Undo2} label="Taux de retour" value={`${s.ret7.toFixed(1)}%`} delta={s.retDelta} invert spark={s.sparkRet} delay={180} />
            </div>

            {/* Wallet */}
            <div className="panel p-5 xl:row-span-2 flex flex-col animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Wallet className="h-4 w-4" /></span>
                <h3 className="text-[14px] font-semibold text-foreground">Portefeuille</h3>
                <Link to="/zoric/finances" className="ml-auto h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><ArrowUpRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-4 text-[12px] text-muted-foreground">Bénéfice net du mois</div>
              <div className={`text-[30px] font-bold tracking-tight tabular ${s.net < 0 ? "text-red-400" : "text-foreground"}`}>{fmtDZD(s.net)}</div>
              <div className="h-24 -mx-2 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.netSeries}>
                    <defs><linearGradient id="walletG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f4f1ee" stopOpacity={0.25} /><stop offset="100%" stopColor="#f4f1ee" stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="v" stroke="var(--foreground)" strokeWidth={2} fill="url(#walletG)" isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MoneyCell label="En livraison" value={fmtDZD(s.onTheRoad)} />
                <MoneyCell label="À expédier" value={fmtDZD(s.pending)} />
                <MoneyCell label="Pub ce mois" value={fmtDZD(s.adSpend)} />
                <MoneyCell label="Charges" value={fmtDZD(s.expenses)} />
              </div>
              <Button asChild className="mt-4 rounded-xl bg-ember-gradient text-white hover:opacity-95 w-full"><Link to="/zoric/finances"><Wallet className="h-4 w-4 mr-1.5" /> Voir les finances</Link></Button>
              {s.toConfirm > 0 && (
                <Link to="/zoric/commandes" className="mt-2 h-9 rounded-xl border border-primary/30 bg-primary/10 text-primary text-[12.5px] font-medium flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {s.toConfirm} à confirmer
                </Link>
              )}

              {/* Monthly target gauge */}
              <div className="mt-5 pt-5 border-t border-border">
                <h3 className="text-[14px] font-semibold text-foreground">Objectif de <span className="capitalize">{monthName}</span></h3>
                <div className="text-[11.5px] text-muted-foreground">{s.daysLeft} jours restants</div>
                <div className="flex items-center gap-3 mt-3">
                  <Gauge value={Math.min(100, (s.monthTakings / s.monthTarget) * 100)} label={fmtDZD(s.monthTakings)} />
                  <div className="space-y-3 text-[12px] min-w-0">
                    <div><div className="text-muted-foreground">En bonne voie pour</div><div className="font-semibold text-foreground tabular">{fmtDZD(s.projected)}</div></div>
                    <div><div className="text-muted-foreground">Reste à vendre</div><div className="font-semibold text-primary tabular">{fmtDZD(Math.max(0, s.monthTarget - s.monthTakings))}</div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Takings chart */}
            <div className="xl:col-span-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <TakingsChart orders={data!.orders} />
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <div className="panel xl:col-span-2 overflow-hidden">
              <div className="flex items-center px-5 pt-5 pb-3">
                <h3 className="text-[15px] font-semibold text-foreground">Dernières commandes</h3>
                <Link to="/zoric/commandes" className="ml-auto text-[12px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">Tout voir <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
              <div className="divide-y divide-border">
                {s.recent.length === 0 && <div className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune commande pour l'instant.</div>}
                {s.recent.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60 transition">
                    <div className="h-9 w-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {o.customer_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate">{o.customer_name}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate">{o.order_code} · {o.wilaya ?? "—"} · {timeAgo(o.created_at ?? o.order_date)}</div>
                    </div>
                    <span className={`ml-auto hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status] ?? o.status}</span>
                    <div className="text-[13px] font-bold text-foreground tabular w-28 text-right">{fmtDZD(Number(o.total))}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <h3 className="text-[15px] font-semibold text-foreground mb-3">À surveiller</h3>
              <div className="space-y-1.5">
                <AlertRow to="/zoric/stocks" icon={PackageIcon} tone="amber" label="Produits en stock faible" value={s.lowStock} />
                <AlertRow to="/zoric/commandes" icon={PhoneCall} tone="ember" label="Commandes à confirmer" value={s.toConfirm} />
                <AlertRow to="/zoric/livraisons" icon={Truck} tone="sky" label="Colis en livraison" value={s.inDelivery} />
                <AlertRow to="/zoric/retours" icon={Undo2} tone="red" label="Colis retournés" value={s.returned} />
                <AlertRow to="/zoric/commandes" icon={AlertTriangle} tone="muted" label="Commandes annulées" value={s.cancelled} />
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-[12px]">
                <span className="text-muted-foreground">ROAS 30 j</span>
                <span className="ml-auto"><Roas metrics={data!.adMetrics} /></span>
              </div>
            </div>
          </div>
        </>
      )}
    </ZoricShell>
  );
}

function Roas({ metrics }: { metrics: { spend: number | string; attributed_revenue: number | string }[] }) {
  const spend = metrics.reduce((t, m) => t + Number(m.spend), 0);
  const rev = metrics.reduce((t, m) => t + Number(m.attributed_revenue), 0);
  const r = spend > 0 ? rev / spend : 0;
  return <StatusPill status={r >= 2.5 ? "success" : r >= 1.5 ? "warning" : spend ? "error" : "neutral"} label={spend ? `${r.toFixed(2)}x` : "—"} />;
}

function MiniKPI({ icon: Icon, label, value, delta, spark, invert, delay = 0 }: {
  icon: typeof ShoppingBag; label: string; value: string; delta: number; spark: { v: number }[]; invert?: boolean; delay?: number;
}) {
  const good = invert ? delta <= 0 : delta >= 0;
  return (
    <div className="panel p-4 flex flex-col animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
        <span className="h-6 w-6 rounded-lg bg-surface-2 border border-border flex items-center justify-center"><Icon className="h-3.5 w-3.5" /></span>
        {label}
      </div>
      <div className="text-[24px] font-bold tracking-tight mt-3 text-foreground tabular leading-none truncate">{value}</div>
      <div className="mt-auto pt-2 flex items-end gap-2">
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${good ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
        </span>
        <div className="h-8 flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Tooltip content={() => null} />
              <Line type="monotone" dataKey="v" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MoneyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[13.5px] font-semibold text-foreground tabular truncate">{value}</div>
    </div>
  );
}

const TONES: Record<string, string> = {
  amber: "bg-amber-500/12 text-amber-400", ember: "bg-primary/12 text-primary", sky: "bg-sky-500/12 text-sky-400",
  red: "bg-red-500/12 text-red-400", muted: "bg-muted text-muted-foreground",
};

function AlertRow({ icon: Icon, tone, label, value, to }: { icon: typeof Truck; tone: string; label: ReactNode; value: number; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 text-[13px] text-foreground/85">{label}</div>
      <div className="font-bold text-foreground tabular">{value}</div>
    </Link>
  );
}

/** Semi-circular ticked gauge (as in the reference design). */
function Gauge({ value, label }: { value: number; label: string }) {
  const ticks = 34;
  return (
    <div className="relative w-[150px] h-[88px] shrink-0">
      <svg viewBox="0 0 150 88" className="w-full h-full">
        {Array.from({ length: ticks }, (_, i) => {
          const a = Math.PI - (i / (ticks - 1)) * Math.PI;
          const on = (i / (ticks - 1)) * 100 <= value;
          const r1 = 58, r2 = 72;
          return (
            <line key={i} x1={75 + r1 * Math.cos(a)} y1={80 - r1 * Math.sin(a)} x2={75 + r2 * Math.cos(a)} y2={80 - r2 * Math.sin(a)}
              stroke={on ? "var(--ember)" : "var(--border)"} strokeWidth="3" strokeLinecap="round" />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-[22px] font-bold text-foreground tabular leading-none">{Math.round(value)}%</div>
        <div className="text-[10px] text-muted-foreground tabular truncate px-2">{label}</div>
      </div>
    </div>
  );
}
