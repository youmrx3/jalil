import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  DollarSign, TrendingUp, Package, ShoppingBag, RotateCcw, Percent,
  Boxes, AlertTriangle, Store,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { AppLayout } from "@/components/app-layout";
import { KPICard } from "@/components/kpi-card";
import { ChartCard, CHART_COLORS, PIE_PALETTE } from "@/components/chart-card";
import { useApp } from "@/lib/store";
import { businessTotals, monthlySeries, productStats, sellingPrice } from "@/lib/calc";
import { fmtDZD, fmtNum, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/ecom")({
  head: () => ({
    meta: [
      { title: "E-commerce Dashboard — Nexus Business" },
      { name: "description", content: "Product sales, stock, delivery rate and profit analytics." },
    ],
  }),
  component: EcomDashboard,
});

function EcomDashboard() {
  const products = useApp((s) => s.products);
  const orders = useApp((s) => s.orders);

  const totals = useMemo(() => businessTotals(products, orders), [products, orders]);
  const series = useMemo(() => monthlySeries(orders, products), [orders, products]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + o.quantity);
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [orders]);

  const topProducts = useMemo(
    () =>
      products
        .map((p) => {
          const s = productStats(p, orders);
          return { name: p.name.slice(0, 18), revenue: Math.round(s.revenue), profit: Math.round(s.netProfit) };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
    [products, orders],
  );

  const deliveryRate = totals.delivered + totals.returned > 0
    ? (totals.delivered / (totals.delivered + totals.returned)) * 100
    : 0;

  const adSpend = useMemo(() => {
    let s = 0;
    for (const p of products) {
      const st = productStats(p, orders);
      s += (p.facebookAdCost || 0) * st.delivered;
    }
    return s;
  }, [products, orders]);

  return (
    <AppLayout title="E-commerce Dashboard">
      <div className="mb-4 flex items-center gap-2">
        <Store className="h-5 w-5 text-[color:var(--electric)]" />
        <h2 className="text-xl font-bold tracking-tight">Product Performance</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Revenue" value={fmtDZD(totals.revenue)} icon={DollarSign} tone="primary" />
        <KPICard label="Net Profit" value={fmtDZD(totals.netProfit)} icon={TrendingUp} tone="success" />
        <KPICard label="Units Sold" value={fmtNum(totals.unitsSold)} icon={ShoppingBag} />
        <KPICard label="Delivery Rate" value={fmtPct(deliveryRate)} icon={Package} tone={deliveryRate < 60 ? "danger" : "success"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <KPICard label="Returned" value={fmtNum(totals.returned)} icon={RotateCcw} tone="danger" />
        <KPICard label="Return Rate" value={fmtPct(totals.returnRate)} icon={Percent} tone={totals.returnRate > 15 ? "danger" : "default"} />
        <KPICard label="Total Ad Spend" value={fmtDZD(adSpend)} icon={DollarSign} tone="warning" hint="Meta / Facebook" />
        <KPICard label="Low Stock Alerts" value={fmtNum(totals.lowStock)} icon={AlertTriangle} tone={totals.lowStock > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Top Products" subtitle="By revenue" className="lg:col-span-2">
          {topProducts.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No sales yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} stroke="currentColor" opacity={0.6} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtDZD(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill={CHART_COLORS.royal} radius={[6, 6, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill={CHART_COLORS.sky} radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Orders by Status" subtitle="Volume breakdown">
          {statusData.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No orders</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Monthly Trend" subtitle="Revenue and profit over time" className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} />
            <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtDZD(v)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.sky} strokeWidth={2.5} dot={{ r: 3 }} name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke={CHART_COLORS.royal} strokeWidth={2.5} dot={{ r: 3 }} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 p-4" style={{ background: "var(--gradient-card)" }}>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Boxes className="h-4 w-4" /> Stock Overview</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {products.length === 0 && <p className="text-xs text-muted-foreground">No products yet.</p>}
            {products.map((p) => {
              const critical = p.stock <= p.minStock;
              const pct = p.minStock > 0 ? Math.min(100, (p.stock / (p.minStock * 3)) * 100) : 100;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate">{p.name}</span>
                    <span className={critical ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                      {p.stock} / min {p.minStock}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: critical ? CHART_COLORS.danger : CHART_COLORS.royal }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 p-4" style={{ background: "var(--gradient-card)" }}>
          <p className="text-sm font-semibold mb-3">Selling Prices</p>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {products.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="truncate">{p.name}</span>
                <span className="font-semibold text-[color:var(--royal)] dark:text-[color:var(--electric)]">{fmtDZD(sellingPrice(p))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
