import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { ZoricKPI } from "@/components/zoric/kpi-card";
import { Toolbar, EmptyState, ConfirmDelete, EntityDialog, type FormValues } from "@/components/zoric/crud";
import { listFinance, saveExpense, deleteExpense } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD, fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/finances")({
  head: () => ({
    meta: [
      { title: "Finances — Zoric Commerce OS" },
      { name: "description", content: "Chiffre d'affaires, coûts, dépenses et bénéfice net de votre boutique COD." },
      { property: "og:title", content: "Finances — Zoric Commerce OS" },
      { property: "og:description", content: "Compte de résultat en temps réel : ventes, publicité, dépenses, marge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const CATEGORIES = [
  { value: "salaires", label: "Salaires" },
  { value: "loyer", label: "Loyer" },
  { value: "packaging", label: "Emballage" },
  { value: "transport", label: "Transport" },
  { value: "abonnements", label: "Abonnements / outils" },
  { value: "autres", label: "Autres" },
];
const CAT_COLORS = ["#FF5A1F", "#FF8A4C", "#0EA5E9", "#F59E0B", "#16A34A", "#6F6A66"];

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listFinance);
  const save = useServerFn(saveExpense);
  const remove = useServerFn(deleteExpense);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-finance"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [values, setValues] = useState<FormValues>({});
  const [toDelete, setToDelete] = useState<string | null>(null);

  const invalidate = () => {
    ["zoric-finance", "zoric-overview", "zoric-reports"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const saveMut = useMutation({
    mutationFn: (v: FormValues) => save({
      data: {
        id: editId,
        values: {
          label: v["label"], category: v["category"] || "autres",
          amount: Number(v["amount"] ?? 0),
          expense_date: v["expense_date"] || new Date().toISOString().slice(0, 10),
          note: v["note"] || null,
        },
      },
    }),
    onSuccess: () => { invalidate(); setOpen(false); toast.success("Dépense enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Dépense supprimée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pnl = useMemo(() => {
    const orders = data?.orders ?? [];
    const delivered = orders.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce((s, o) => s + Number(o.total), 0);
    const cogs = delivered.reduce((s, o) => s + Number(o.product_cost), 0);
    const shipping = delivered.reduce((s, o) => s + Number(o.delivery_cost), 0);
    const adSpend = (data?.adSpend ?? []).reduce((s, a) => s + Number(a.spend), 0);
    const expenses = (data?.expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const gross = revenue - cogs - shipping;
    const net = gross - adSpend - expenses;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;

    const byMonth: Record<string, { m: string; ca: number; couts: number }> = {};
    delivered.forEach((o) => {
      const m = String(o.order_date).slice(0, 7);
      byMonth[m] = byMonth[m] ?? { m, ca: 0, couts: 0 };
      byMonth[m].ca += Number(o.total);
      byMonth[m].couts += Number(o.product_cost) + Number(o.delivery_cost);
    });
    (data?.expenses ?? []).forEach((e) => {
      const m = String(e.expense_date).slice(0, 7);
      byMonth[m] = byMonth[m] ?? { m, ca: 0, couts: 0 };
      byMonth[m].couts += Number(e.amount);
    });
    (data?.adSpend ?? []).forEach((a) => {
      const m = String(a.metric_date).slice(0, 7);
      byMonth[m] = byMonth[m] ?? { m, ca: 0, couts: 0 };
      byMonth[m].couts += Number(a.spend);
    });
    const series = Object.values(byMonth).sort((a, b) => a.m.localeCompare(b.m)).slice(-8)
      .map((r) => ({ ...r, net: r.ca - r.couts }));

    const byCat: Record<string, number> = {};
    (data?.expenses ?? []).forEach((e) => {
      const c = e.category ?? "autres";
      byCat[c] = (byCat[c] ?? 0) + Number(e.amount);
    });
    if (adSpend > 0) byCat["publicité"] = adSpend;
    if (cogs > 0) byCat["achat produits"] = cogs;
    if (shipping > 0) byCat["livraison"] = shipping;
    const donut = Object.entries(byCat).map(([name, value]) => ({ name, value }));

    return { revenue, cogs, shipping, adSpend, expenses, gross, net, margin, series, donut };
  }, [data]);

  const rows = useMemo(() => (data?.expenses ?? []).filter((e) =>
    `${e.label} ${e.category ?? ""}`.toLowerCase().includes(search.toLowerCase())), [data, search]);

  const openNew = () => {
    setEditId(undefined);
    setValues({ label: "", category: "autres", amount: 0, expense_date: new Date().toISOString().slice(0, 10), note: "" });
    setOpen(true);
  };
  const openEdit = (id: string) => {
    const e = data?.expenses.find((x) => x.id === id);
    if (!e) return;
    setEditId(id);
    setValues({ label: e.label, category: e.category ?? "autres", amount: Number(e.amount), expense_date: e.expense_date, note: e.note ?? "" });
    setOpen(true);
  };

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Finances" subtitle="Résultat calculé en direct à partir de vos commandes livrées, publicités et dépenses.">
      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ZoricKPI label="Chiffre d'affaires livré" value={fmtDZD(pnl.revenue)} icon={Wallet} iconBg="bg-blue-500/12 text-primary" />
            <ZoricKPI label="Marge brute" value={fmtDZD(pnl.gross)} icon={TrendingUp} iconBg="bg-orange-500/12 text-orange-400" />
            <ZoricKPI label="Bénéfice net" value={fmtDZD(pnl.net)} icon={pnl.net >= 0 ? TrendingUp : TrendingDown}
              iconBg={pnl.net >= 0 ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"} />
            <ZoricKPI label="Marge nette" value={`${pnl.margin.toFixed(1)}%`} icon={Percent} iconBg="bg-amber-500/12 text-amber-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="p-5 border-border lg:col-span-2">
              <h3 className="font-semibold text-foreground mb-4">Revenus vs coûts par mois</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnl.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B2B2B" />
                    <XAxis dataKey="m" fontSize={11} stroke="#6F6A66" />
                    <YAxis fontSize={11} stroke="#6F6A66" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => fmtDZD(v)} contentStyle={{ borderRadius: 10, border: "1px solid #2B2B2B" }} />
                    <Legend />
                    <Bar dataKey="ca" name="CA" fill="#FF5A1F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="couts" name="Coûts" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 border-border rounded-2xl">
              <h3 className="font-semibold text-foreground mb-4">Structure des coûts</h3>
              {pnl.donut.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun coût enregistré.</p>
              ) : (
                <>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pnl.donut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                          {pnl.donut.map((d, i) => <Cell key={d.name} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtDZD(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1 mt-2 text-xs">
                    {pnl.donut.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="text-muted-foreground capitalize truncate">{d.name}</span>
                        <span className="ml-auto font-semibold">{fmtDZD(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card className="p-5 border-border mb-6">
            <h3 className="font-semibold text-foreground mb-3">Compte de résultat</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <PnlTile label="CA livré" value={pnl.revenue} />
              <PnlTile label="Achat produits" value={-pnl.cogs} />
              <PnlTile label="Livraison" value={-pnl.shipping} />
              <PnlTile label="Publicité" value={-pnl.adSpend} />
              <PnlTile label="Dépenses fixes" value={-pnl.expenses} />
              <PnlTile label="Bénéfice net" value={pnl.net} strong />
            </div>
          </Card>

          <Toolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Nouvelle dépense" placeholder="Rechercher une dépense…" />

          {rows.length === 0 ? (
            <EmptyState title="Aucune dépense" hint="Ajoutez vos charges (salaires, loyer, outils) pour obtenir un bénéfice net exact."
              action={<Button className="bg-primary" onClick={openNew}>Ajouter une dépense</Button>} />
          ) : (
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SelectAllHead selection={selection} />
                      <TableHead>Libellé</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((e) => (
                      <TableRow key={e.id}>
                        <SelectCell selection={selection} id={e.id} />
                        <TableCell className="font-medium text-foreground">{e.label}</TableCell>
                        <TableCell><Badge variant="outline" className="font-normal capitalize">{e.category ?? "autres"}</Badge></TableCell>
                        <TableCell className="text-right font-medium text-red-400">-{fmtDZD(Number(e.amount))}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{fmtDate(e.expense_date)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(e.id)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setToDelete(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}

      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editId ? "Modifier la dépense" : "Nouvelle dépense"}
        values={values} submitting={saveMut.isPending} onSubmit={(v) => saveMut.mutate(v)}
        fields={[
          { name: "label", label: "Libellé", required: true },
          { name: "category", label: "Catégorie", type: "select", options: CATEGORIES },
          { name: "amount", label: "Montant (DZD)", type: "number", required: true },
          { name: "expense_date", label: "Date", type: "date" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
      />

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }} />
      <BulkBar
        selection={selection}
        entity="expenses"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-finance"]}
        allowDuplicate={true}
        exportName="depenses"
      />

    </ZoricShell>
  );
}

function PnlTile({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  const positive = value >= 0;
  return (
    <div className={`rounded-lg p-3 border ${strong ? "border-primary bg-blue-500/12/50" : "border-border bg-muted"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-bold mt-0.5 ${strong ? "text-primary" : positive ? "text-foreground" : "text-red-400"}`}>
        {fmtDZD(value)}
      </div>
    </div>
  );
}
