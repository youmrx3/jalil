import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, Wallet, Clock, DollarSign, Briefcase, TrendingUp, Target } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppLayout } from "@/components/app-layout";
import { KPICard } from "@/components/kpi-card";
import { ChartCard, CHART_COLORS, PIE_PALETTE } from "@/components/chart-card";
import { useApp } from "@/lib/store";
import { clientUsdProgressPct } from "@/lib/calc";
import { fmtDZD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/b2b")({
  head: () => ({
    meta: [
      { title: "B2B Dashboard — Nexus Business" },
      { name: "description", content: "Agency clients, contracted budgets and cash-in analytics." },
    ],
  }),
  component: B2BDashboard,
});

function B2BDashboard() {
  const clients = useApp((s) => s.clients);
  

  const metrics = useMemo(() => {
    let totalUSD = 0, usdSpent = 0, revenue = 0, received = 0, pending = 0;
    for (const c of clients) {
      totalUSD += c.adBudgetUSD;
      usdSpent += c.usdSpent || 0;
      revenue += c.servicePriceDZD || 0;
      received += c.amountReceivedDZD || 0;
      pending += Math.max(0, (c.servicePriceDZD || 0) - (c.amountReceivedDZD || 0));
    }
    return {
      totalUSD,
      usdSpent,
      revenue,
      received,
      pending,
      activeCount: clients.filter((c) => c.paymentStatus !== "Cancelled").length,
    };
  }, [clients]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) map.set(c.paymentStatus, (map.get(c.paymentStatus) ?? 0) + 1);
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [clients]);

  const topClients = useMemo(
    () =>
      clients
        .map((c) => ({
          name: c.company.slice(0, 16),
          fee: Math.round(c.servicePriceDZD || 0),
          received: Math.round(c.amountReceivedDZD || 0),
        }))
        .sort((a, b) => b.fee - a.fee)
        .slice(0, 7),
    [clients],
  );

  const industryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) {
      const k = c.industry || "Other";
      map.set(k, (map.get(k) ?? 0) + (c.servicePriceDZD || 0));
    }
    return Array.from(map, ([name, value]) => ({ name, value: Math.round(value) }));
  }, [clients]);

  return (
    <AppLayout title="B2B Agency Dashboard">
      <div className="mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-[color:var(--electric)]" />
        <h2 className="text-xl font-bold tracking-tight">Sponsor Client Analytics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active Clients" value={fmtNum(metrics.activeCount)} icon={Users} tone="primary" />
        <KPICard label="Service Revenue" value={fmtDZD(metrics.revenue)} icon={DollarSign} tone="accent" hint="Agreed fees" />
        <KPICard label="Cash Received" value={fmtDZD(metrics.received)} icon={Wallet} tone="success" />
        <KPICard label="Payments Pending" value={fmtDZD(metrics.pending)} icon={Clock} tone="warning" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <KPICard label="USD Budget Managed" value={`$${metrics.totalUSD.toLocaleString()}`} icon={Target} tone="primary" />
        <KPICard label="USD Spent" value={`$${metrics.usdSpent.toLocaleString()}`} icon={TrendingUp} tone="accent" />
        <KPICard label="USD Remaining" value={`$${Math.max(0, metrics.totalUSD - metrics.usdSpent).toLocaleString()}`} icon={Wallet} tone="success" />
        <KPICard label="Spend Progress" value={`${metrics.totalUSD > 0 ? ((metrics.usdSpent / metrics.totalUSD) * 100).toFixed(0) : 0}%`} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Top Clients" subtitle="Budget vs received" className="lg:col-span-2">
          {topClients.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No clients yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.6} />
                <YAxis type="category" dataKey="name" fontSize={11} stroke="currentColor" opacity={0.6} width={110} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtDZD(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="fee" fill={CHART_COLORS.royal} radius={[0, 6, 6, 0]} name="Service Fee" />
                <Bar dataKey="received" fill={CHART_COLORS.sky} radius={[0, 6, 6, 0]} name="Received" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment Status" subtitle="Client distribution">
          {statusData.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No data</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Revenue by Industry" subtitle="Contract value">
          {industryData.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} stroke="currentColor" opacity={0.6} />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.6} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtDZD(v)} />
                <Bar dataKey="value" fill={CHART_COLORS.royal} radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="rounded-xl border border-border/60 p-4" style={{ background: "var(--gradient-card)" }}>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Payment & Ad-Spend Progress
          </p>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {clients.length === 0 && <p className="text-xs text-muted-foreground">No clients yet.</p>}
            {clients.map((c) => {
              const payPct =
                c.servicePriceDZD > 0
                  ? Math.min(100, (c.amountReceivedDZD / c.servicePriceDZD) * 100)
                  : 0;
              const spendPct = clientUsdProgressPct(c);
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{c.company}</span>
                    <span className="text-muted-foreground">
                      Pay {payPct.toFixed(0)}% · Spend {spendPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${payPct}%`, background: "var(--gradient-primary)" }}
                    />
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${spendPct}%`, background: CHART_COLORS.sky }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
