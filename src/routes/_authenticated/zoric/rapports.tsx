import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, ShoppingBag, Percent, Users } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { ZoricKPI } from "@/components/zoric/kpi-card";
import { EmptyState } from "@/components/zoric/crud";
import { getReports } from "@/lib/zoric/data.functions";
import { fmtDZD, fmtNum, fmtDateShort, STATUS_LABELS } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — Zoric Commerce OS" },
      { name: "description", content: "Analyses complètes : ventes, produits, wilayas, sources et rentabilité." },
      { property: "og:title", content: "Rapports — Zoric Commerce OS" },
      { property: "og:description", content: "Rapports avancés et export CSV de votre activité COD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const RANGES = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
  { value: "365", label: "12 derniers mois" },
  { value: "all", label: "Tout l'historique" },
];
const COLORS = ["#FF5A1F", "#FF8A4C", "#0EA5E9", "#16A34A", "#F59E0B", "#DC2626", "#6F6A66"];

function Page() {
  const fetchAll = useServerFn(getReports);
  const { data, isLoading } = useQuery({ queryKey: ["zoric-reports"], queryFn: () => fetchAll() });
  const [range, setRange] = useState("30");

  const r = useMemo(() => {
    if (!data) return null;
    const from = range === "all" ? "0000-01-01"
      : new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
    const orders = data.orders.filter((o) => String(o.order_date) >= from);
    const ids = new Set(orders.map((o) => o.id));
    const items = data.items.filter((i) => ids.has(i.order_id));
    const ads = data.adSpend.filter((a) => String(a.metric_date) >= from);
    const expenses = data.expenses.filter((e) => String(e.expense_date) >= from);

    const delivered = orders.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce((s, o) => s + Number(o.total), 0);
    const adSpend = ads.reduce((s, a) => s + Number(a.spend), 0);
    const expTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const cogs = delivered.reduce((s, o) => s + Number(o.product_cost) + Number(o.delivery_cost), 0);
    const net = revenue - cogs - adSpend - expTotal;
    const deliveryRate = orders.length ? (delivered.length / orders.length) * 100 : 0;
    const aov = delivered.length ? revenue / delivered.length : 0;

    const byDay: Record<string, { day: string; ca: number; cmd: number }> = {};
    orders.forEach((o) => {
      const d = String(o.order_date);
      byDay[d] = byDay[d] ?? { day: d, ca: 0, cmd: 0 };
      byDay[d].cmd += 1;
      if (o.status === "delivered") byDay[d].ca += Number(o.total);
    });
    const series = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day))
      .map((x) => ({ ...x, day: fmtDateShort(x.day) }));

    const byProduct: Record<string, { name: string; qty: number; ca: number; profit: number }> = {};
    items.forEach((i) => {
      const k = i.product_name || "Sans nom";
      byProduct[k] = byProduct[k] ?? { name: k, qty: 0, ca: 0, profit: 0 };
      byProduct[k].qty += Number(i.quantity);
      byProduct[k].ca += Number(i.quantity) * Number(i.unit_price);
      byProduct[k].profit += Number(i.quantity) * (Number(i.unit_price) - Number(i.unit_cost));
    });
    const products = Object.values(byProduct).sort((a, b) => b.ca - a.ca).slice(0, 10);

    const byWilaya: Record<string, number> = {};
    orders.forEach((o) => { const w = o.wilaya || "Non renseignée"; byWilaya[w] = (byWilaya[w] ?? 0) + 1; });
    const wilayas = Object.entries(byWilaya).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);

    const bySource: Record<string, number> = {};
    orders.forEach((o) => { const s = o.source || "Direct"; bySource[s] = (bySource[s] ?? 0) + 1; });
    const sources = Object.entries(bySource).map(([name, value]) => ({ name, value }));

    const byStatus: Record<string, number> = {};
    orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });
    const statuses = Object.entries(byStatus).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }));

    const customers = [...data.customers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent)).slice(0, 8);

    return { orders, revenue, net, deliveryRate, aov, series, products, wilayas, sources, statuses, customers };
  }, [data, range]);

  const exportCsv = () => {
    if (!r) return;
    const head = ["Code", "Date", "Statut", "Wilaya", "Source", "Total", "Coût produits", "Livraison", "Bénéfice"];
    const lines = r.orders.map((o) => [
      o.order_code, o.order_date, STATUS_LABELS[o.status] ?? o.status, o.wilaya ?? "", o.source ?? "",
      Number(o.total), Number(o.product_cost), Number(o.delivery_cost), Number(o.estimated_profit),
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zoric-rapport-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ZoricShell title="Rapports" subtitle="Toutes vos données consolidées : ventes, produits, régions et rentabilité.">
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-56 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>{RANGES.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={exportCsv} className="shrink-0">
          <Download className="h-4 w-4 mr-1" /> Exporter en CSV
        </Button>
      </div>

      {isLoading || !r ? <Skeleton className="h-64" /> : r.orders.length === 0 ? (
        <EmptyState title="Aucune donnée sur la période" hint="Créez des commandes ou élargissez la période pour voir vos rapports." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ZoricKPI label="CA livré" value={fmtDZD(r.revenue)} icon={TrendingUp} iconBg="bg-blue-500/12 text-primary" />
            <ZoricKPI label="Commandes" value={fmtNum(r.orders.length)} icon={ShoppingBag} iconBg="bg-orange-500/12 text-orange-400" />
            <ZoricKPI label="Taux de livraison" value={`${r.deliveryRate.toFixed(1)}%`} icon={Percent} iconBg="bg-emerald-500/12 text-emerald-400" />
            <ZoricKPI label="Panier moyen" value={fmtDZD(r.aov)} icon={Users} iconBg="bg-amber-500/12 text-amber-400" />
          </div>

          <Card className="p-5 border-border mb-6">
            <h3 className="font-semibold text-foreground mb-4">Ventes et volume de commandes</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={r.series}>
                  <defs>
                    <linearGradient id="rapGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                  <XAxis dataKey="day" fontSize={11} stroke="#6F6A66" />
                  <YAxis fontSize={11} stroke="#6F6A66" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number, n) => (n === "ca" ? fmtDZD(v) : v)} contentStyle={{ borderRadius: 10, border: "1px solid #2B2B2B" }} />
                  <Area type="monotone" dataKey="ca" name="CA livré" stroke="#FF5A1F" strokeWidth={2} fill="url(#rapGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-5 border-border rounded-2xl">
              <h3 className="font-semibold text-foreground mb-4">Top wilayas</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.wilayas} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                    <XAxis type="number" fontSize={11} stroke="#6F6A66" />
                    <YAxis type="category" dataKey="name" width={90} fontSize={11} stroke="#6F6A66" />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #2B2B2B" }} />
                    <Bar dataKey="value" name="Commandes" fill="#FF5A1F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 border-border rounded-2xl">
              <h3 className="font-semibold text-foreground mb-4">Sources d'acquisition</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={r.sources} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                      {r.sources.map((s, i) => <Cell key={s.name} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border overflow-hidden">
              <div className="p-5 border-b border-border rounded-2xl"><h3 className="font-semibold text-foreground">Top produits</h3></div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.products.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                        <TableCell className="text-right">{p.qty}</TableCell>
                        <TableCell className="text-right">{fmtDZD(p.ca)}</TableCell>
                        <TableCell className="text-right text-emerald-400">{fmtDZD(p.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="border-border overflow-hidden">
              <div className="p-5 border-b border-border rounded-2xl"><h3 className="font-semibold text-foreground">Meilleurs clients</h3></div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden sm:table-cell">Wilaya</TableHead>
                      <TableHead className="text-right">Cmd</TableHead>
                      <TableHead className="text-right">Total dépensé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.customers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium max-w-[180px] truncate">{c.full_name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.wilaya ?? "—"}</TableCell>
                        <TableCell className="text-right">{c.total_orders}</TableCell>
                        <TableCell className="text-right font-medium">{fmtDZD(Number(c.total_spent))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </>
      )}
    </ZoricShell>
  );
}
