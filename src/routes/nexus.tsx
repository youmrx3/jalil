import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  Palette,
  Store,
  Briefcase,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AppLayout } from "@/components/app-layout";
import { KPICard } from "@/components/kpi-card";
import { ChartCard, CHART_COLORS, PIE_PALETTE } from "@/components/chart-card";
import { useApp } from "@/lib/store";
import { businessTotals, monthlySeries, clientBudgetDZD } from "@/lib/calc";
import { fmtDZD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/nexus")({
  head: () => ({
    meta: [
      { title: "General Dashboard — Nexus Business" },
      { name: "description", content: "Unified KPIs across E-commerce, B2B agency and branding streams." },
    ],
  }),
  component: GeneralDashboard,
});

function GeneralDashboard() {
  const products = useApp((s) => s.products);
  const orders = useApp((s) => s.orders);
  const clients = useApp((s) => s.clients);
  const brandProjects = useApp((s) => s.brandProjects);
  const settings = useApp((s) => s.settings);

  const totals = useMemo(() => businessTotals(products, orders), [products, orders]);
  const series = useMemo(() => monthlySeries(orders, products), [orders, products]);

  const b2b = useMemo(() => {
    let revenue = 0, received = 0, pending = 0;
    for (const c of clients) {
      const b = clientBudgetDZD(c, settings);
      revenue += b;
      received += c.amountReceivedDZD;
      pending += Math.max(0, b - c.amountReceivedDZD);
    }
    return { revenue, received, pending };
  }, [clients, settings]);

  const branding = useMemo(() => {
    let revenue = 0, received = 0, pending = 0;
    for (const p of brandProjects) {
      revenue += p.priceDZD;
      received += p.depositDZD;
      if (p.status !== "Cancelled") pending += Math.max(0, p.priceDZD - p.depositDZD);
    }
    return { revenue, received, pending, count: brandProjects.length };
  }, [brandProjects]);

  const grandRevenue = totals.revenue + b2b.revenue + branding.revenue;
  const grandReceived = totals.revenue + b2b.received + branding.received;
  const grandPending = b2b.pending + branding.pending;

  const mixData = [
    { name: "E-commerce", value: Math.round(totals.revenue) },
    { name: "B2B Agency", value: Math.round(b2b.revenue) },
    { name: "Branding", value: Math.round(branding.revenue) },
  ].filter((x) => x.value > 0);

  return (
    <AppLayout title="General Dashboard">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back 👋</h2>
        <p className="text-sm text-muted-foreground">All revenue streams at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Revenue" value={fmtDZD(grandRevenue)} icon={DollarSign} tone="primary" />
        <KPICard label="Cash Received" value={fmtDZD(grandReceived)} icon={Wallet} tone="success" />
        <KPICard label="Pending Payments" value={fmtDZD(grandPending)} icon={Clock} tone="warning" />
        <KPICard label="Net E-com Profit" value={fmtDZD(totals.netProfit)} icon={TrendingUp} tone="accent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <KPICard label="E-commerce Revenue" value={fmtDZD(totals.revenue)} icon={Store} hint={`${fmtNum(totals.delivered)} delivered`} />
        <KPICard label="B2B Revenue" value={fmtDZD(b2b.revenue)} icon={Briefcase} hint={`${clients.length} clients`} />
        <KPICard label="Branding Revenue" value={fmtDZD(branding.revenue)} icon={Palette} hint={`${branding.count} projects`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Monthly Profit" subtitle="E-commerce net profit trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.royal} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART_COLORS.royal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} />
              <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => fmtDZD(v)}
              />
              <Area type="monotone" dataKey="profit" stroke={CHART_COLORS.royal} strokeWidth={2.5} fill="url(#profitFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Mix" subtitle="By business stream">
          {mixData.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              No revenue yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {mixData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtDZD(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Revenue vs Expenses" subtitle="Monthly view" className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.sky} stopOpacity={0.6} />
                <stop offset="100%" stopColor={CHART_COLORS.sky} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.danger} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.6} />
            <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtDZD(v)} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.sky} strokeWidth={2} fill="url(#revFill)" name="Revenue" />
            <Area type="monotone" dataKey="expenses" stroke={CHART_COLORS.danger} strokeWidth={2} fill="url(#expFill)" name="Expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        Data live-updates as you add orders, clients, and brand projects.
      </div>
    </AppLayout>
  );
}
