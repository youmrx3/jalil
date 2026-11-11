import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/kpi-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { businessTotals, monthlySeries, productStats, clientBudgetDZD, sellingPrice } from "@/lib/calc";
import { fmtDZD, fmtNum, fmtPct, fmtDate } from "@/lib/format";
import { exportToExcel, exportTableToPDF } from "@/lib/io";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Nexus Business" },
      { name: "description", content: "Generate sales, profit, returns, stock, and B2B reports with export." },
    ],
  }),
  component: ReportsPage,
});

type Range = "day" | "week" | "month" | "year" | "custom";

function ReportsPage() {
  const products = useApp((s) => s.products);
  const orders = useApp((s) => s.orders);
  const clients = useApp((s) => s.clients);
  const settings = useApp((s) => s.settings);

  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { start, end } = useMemo(() => {
    const now = new Date();
    let s = new Date();
    if (range === "day") s.setHours(0, 0, 0, 0);
    else if (range === "week") s.setDate(now.getDate() - 7);
    else if (range === "month") s.setMonth(now.getMonth() - 1);
    else if (range === "year") s.setFullYear(now.getFullYear() - 1);
    else if (range === "custom") {
      s = from ? new Date(from) : new Date(0);
      return { start: s, end: to ? new Date(to + "T23:59:59") : new Date() };
    }
    return { start: s, end: now };
  }, [range, from, to]);

  const scoped = useMemo(
    () => orders.filter((o) => { const d = new Date(o.date); return d >= start && d <= end; }),
    [orders, start, end],
  );

  const totals = useMemo(() => businessTotals(products, scoped), [products, scoped]);
  const series = useMemo(() => monthlySeries(scoped, products), [scoped, products]);

  const perProduct = useMemo(
    () =>
      products
        .map((p) => ({ p, s: productStats(p, scoped) }))
        .sort((a, b) => b.s.revenue - a.s.revenue),
    [products, scoped],
  );

  const bestSelling = perProduct.slice(0, 5).map(({ p, s }) => ({ name: p.name, value: s.delivered }));
  const mostReturned = [...perProduct]
    .sort((a, b) => b.s.returned - a.s.returned)
    .slice(0, 5)
    .map(({ p, s }) => ({ name: p.name, value: s.returned }));

  const PIE_COLORS = ["oklch(0.72 0.18 230)", "oklch(0.65 0.2 150)", "oklch(0.7 0.2 60)", "oklch(0.6 0.22 27)", "oklch(0.55 0.15 300)"];

  const exportAllExcel = () => {
    exportToExcel(`report_${range}`, {
      Summary: [{
        Revenue: totals.revenue, NetProfit: totals.netProfit, GrossProfit: totals.grossProfit,
        ProductCost: totals.productCost, ReturnCost: totals.returnCost, Delivered: totals.delivered,
        Returned: totals.returned, ReturnRate: totals.returnRate.toFixed(2) + "%",
      }],
      Sales: scoped.map((o) => ({ Date: fmtDate(o.date), OrderID: o.orderId, Client: o.clientName, Product: o.productName, Qty: o.quantity, Status: o.status })),
      Products: perProduct.map(({ p, s }) => ({
        Product: p.name, SKU: p.sku, Stock: p.stock, Delivered: s.delivered, Returned: s.returned,
        Revenue: s.revenue, GrossProfit: s.grossProfit, NetProfit: s.netProfit, Margin: s.margin.toFixed(2) + "%",
      })),
      Clients: clients.map((c) => ({
        Company: c.company, Budget_USD: c.adBudgetUSD, Budget_DZD: clientBudgetDZD(c, settings),
        Received: c.amountReceivedDZD, Remaining: clientBudgetDZD(c, settings) - c.amountReceivedDZD,
        Status: c.paymentStatus,
      })),
    });
  };

  const exportPDF = () => {
    exportTableToPDF(
      `${settings.companyName} — Report`,
      ["Product", "Delivered", "Returned", "Revenue", "Net Profit", "Margin"],
      perProduct.map(({ p, s }) => [p.name, s.delivered, s.returned, fmtDZD(s.revenue), fmtDZD(s.netProfit), fmtPct(s.margin)]),
    );
  };

  return (
    <AppLayout title="Reports">
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Range</Label>
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="year">Last 12 months</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {range === "custom" && (
            <>
              <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportAllExcel}><Download className="h-4 w-4 mr-1" /> Excel</Button>
            <Button variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Revenue" value={fmtDZD(totals.revenue)} tone="accent" />
        <KPICard label="Net Profit" value={fmtDZD(totals.netProfit)} tone="success" />
        <KPICard label="Delivered" value={fmtNum(totals.delivered)} />
        <KPICard label="Return Rate" value={fmtPct(totals.returnRate)} tone={totals.returnRate > 15 ? "danger" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Profit / Returns</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => fmtDZD(v)} />
                <Legend />
                <Bar dataKey="profit" fill="oklch(0.65 0.2 150)" name="Profit" />
                <Bar dataKey="expenses" fill="oklch(0.6 0.22 27)" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Best Selling Products</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bestSelling} dataKey="value" nameKey="name" outerRadius={90} label>
                  {bestSelling.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Product Report</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead><TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Delivered</TableHead><TableHead className="text-right">Returned</TableHead>
                <TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perProduct.map(({ p, s }) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{fmtDZD(sellingPrice(p))}</TableCell>
                  <TableCell className="text-right">{s.delivered}</TableCell>
                  <TableCell className="text-right">{s.returned}</TableCell>
                  <TableCell className="text-right">{fmtDZD(s.revenue)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtDZD(s.netProfit)}</TableCell>
                  <TableCell className="text-right">{fmtPct(s.margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {mostReturned.some((r) => r.value > 0) && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-sm">Most Returned Products</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {mostReturned.filter((r) => r.value > 0).map((r) => (
                <li key={r.name} className="flex justify-between"><span>{r.name}</span><span className="font-medium">{r.value} returns</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
