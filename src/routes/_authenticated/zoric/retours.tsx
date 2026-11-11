import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Undo2, PackageCheck, Ban, Wallet } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { ZoricKPI } from "@/components/zoric/kpi-card";
import { Toolbar, EmptyState, ConfirmDelete, EntityDialog, type FormValues } from "@/components/zoric/crud";
import { listReturns, saveReturn, deleteReturn } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD, fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/retours")({
  head: () => ({
    meta: [
      { title: "Retours — Zoric Commerce OS" },
      { name: "description", content: "Gérez les colis retournés, leur impact financier et la remise en stock." },
      { property: "og:title", content: "Retours — Zoric Commerce OS" },
      { property: "og:description", content: "Suivi des retours COD, motifs et remise en stock automatique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const REASONS = [
  { value: "refused", label: "Client a refusé" },
  { value: "unreachable", label: "Client injoignable" },
  { value: "wrong_address", label: "Adresse erronée" },
  { value: "damaged", label: "Produit endommagé" },
  { value: "changed_mind", label: "Changement d'avis" },
  { value: "other", label: "Autre" },
];
const REASON_LABELS: Record<string, string> = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listReturns);
  const save = useServerFn(saveReturn);
  const remove = useServerFn(deleteReturn);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-returns"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [values, setValues] = useState<FormValues>({});
  const [toDelete, setToDelete] = useState<string | null>(null);

  const invalidate = () => {
    ["zoric-returns", "zoric-orders", "zoric-stock", "zoric-overview", "zoric-finance", "zoric-reports", "zoric-products"]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const saveMut = useMutation({
    mutationFn: (v: FormValues) => save({
      data: {
        id: editId,
        values: {
          order_id: v["order_id"],
          reason: v["reason"] || "other",
          stock_action: v["stock_action"] || "restock",
          financial_impact: Number(v["financial_impact"] ?? 0),
          return_date: v["return_date"] || new Date().toISOString().slice(0, 10),
          note: v["note"] || null,
        },
      },
    }),
    onSuccess: () => { invalidate(); setOpen(false); toast.success("Retour enregistré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Retour supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => (data?.returns ?? []).filter((r) => {
    const o = r.zoric_orders as { order_code?: string; customer_name?: string } | null;
    return `${o?.order_code ?? ""} ${o?.customer_name ?? ""} ${REASON_LABELS[r.reason] ?? r.reason}`
      .toLowerCase().includes(search.toLowerCase());
  }), [data, search]);

  const kpis = useMemo(() => {
    const list = data?.returns ?? [];
    const impact = list.reduce((s, r) => s + Number(r.financial_impact ?? 0), 0);
    const restocked = list.filter((r) => r.stock_action === "restock").length;
    const orders = data?.orders?.length ?? 0;
    return { count: list.length, impact, restocked, rate: orders ? (list.length / orders) * 100 : 0 };
  }, [data]);

  const orderOptions = (data?.orders ?? []).map((o) => ({
    value: o.id, label: `${o.order_code} — ${o.customer_name} (${fmtDZD(Number(o.total))})`,
  }));

  const openNew = () => {
    setEditId(undefined);
    setValues({
      order_id: "", reason: "refused", stock_action: "restock",
      financial_impact: 0, return_date: new Date().toISOString().slice(0, 10), note: "",
    });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const r = data?.returns.find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setValues({
      order_id: r.order_id, reason: r.reason, stock_action: r.stock_action,
      financial_impact: Number(r.financial_impact), return_date: r.return_date, note: r.note ?? "",
    });
    setOpen(true);
  };

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Retours" subtitle="Chaque retour met à jour la commande, le stock et vos finances automatiquement.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ZoricKPI label="Retours enregistrés" value={String(kpis.count)} icon={Undo2} iconBg="bg-red-500/12 text-red-400" />
        <ZoricKPI label="Taux de retour" value={`${kpis.rate.toFixed(1)}%`} icon={Ban} iconBg="bg-amber-500/12 text-amber-400" />
        <ZoricKPI label="Impact financier" value={fmtDZD(kpis.impact)} icon={Wallet} iconBg="bg-muted text-muted-foreground" />
        <ZoricKPI label="Remis en stock" value={String(kpis.restocked)} icon={PackageCheck} iconBg="bg-emerald-500/12 text-emerald-400" />
      </div>

      <Toolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Nouveau retour" placeholder="Rechercher (commande, client, motif)…" />

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucun retour" hint="Enregistrez un retour : la commande passe en « Retournée » et le stock est restitué si vous le demandez."
          action={<Button className="bg-primary" onClick={openNew}>Enregistrer un retour</Button>} />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const o = r.zoric_orders as { order_code?: string; customer_name?: string } | null;
                  return (
                    <TableRow key={r.id}>
                      <SelectCell selection={selection} id={r.id} />
                      <TableCell className="font-medium text-primary">{o?.order_code ?? "—"}</TableCell>
                      <TableCell className="text-sm">{o?.customer_name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="font-normal bg-red-500/12 text-red-400 border-red-500/25">{REASON_LABELS[r.reason] ?? r.reason}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {r.stock_action === "restock" ? "Remis en stock" : r.stock_action === "damaged" ? "Endommagé" : "Aucune action"}
                      </TableCell>
                      <TableCell className="text-right text-red-400 font-medium">{fmtDZD(Number(r.financial_impact))}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{fmtDate(r.return_date)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r.id)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editId ? "Modifier le retour" : "Nouveau retour"}
        description="Le statut de la commande passe automatiquement en « Retournée »."
        values={values}
        submitting={saveMut.isPending}
        onSubmit={(v) => saveMut.mutate(v)}
        fields={[
          { name: "order_id", label: "Commande", type: "select", options: orderOptions, required: true, half: false },
          { name: "reason", label: "Motif du retour", type: "select", options: REASONS },
          {
            name: "stock_action", label: "Action sur le stock", type: "select",
            options: [
              { value: "restock", label: "Remettre en stock" },
              { value: "damaged", label: "Produit endommagé (perte)" },
              { value: "none", label: "Aucune action" },
            ],
            help: "« Remettre en stock » réinjecte les quantités de la commande.",
          },
          { name: "financial_impact", label: "Impact financier (DZD)", type: "number", help: "Frais de retour, livraison perdue, casse…" },
          { name: "return_date", label: "Date du retour", type: "date" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
      />

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }}
        label="Ce retour sera supprimé. Le stock déjà restitué n'est pas repris." />
      <BulkBar
        selection={selection}
        entity="returns"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-returns", "zoric-orders"]}
        allowDuplicate={true}
        exportName="retours"
      />

    </ZoricShell>
  );
}
