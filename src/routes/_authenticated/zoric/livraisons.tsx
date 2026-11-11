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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Truck, PackageCheck, Banknote, Clock } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { ZoricKPI } from "@/components/zoric/kpi-card";
import { Toolbar, EmptyState, ConfirmDelete, EntityDialog, type FormValues } from "@/components/zoric/crud";
import { listDeliveries, saveDelivery, deleteDelivery } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD, fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/livraisons")({
  head: () => ({
    meta: [
      { title: "Livraisons — Zoric Commerce OS" },
      { name: "description", content: "Suivez vos colis, transporteurs et encaissements COD en temps réel." },
      { property: "og:title", content: "Livraisons — Zoric Commerce OS" },
      { property: "og:description", content: "Tracking des expéditions et collecte du cash à la livraison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const D_STATUS = [
  { value: "created", label: "Créée" },
  { value: "picked_up", label: "Ramassée" },
  { value: "in_transit", label: "En transit" },
  { value: "out_for_delivery", label: "En livraison" },
  { value: "delivered", label: "Livrée" },
  { value: "failed", label: "Échec" },
  { value: "returned", label: "Retournée" },
];
const D_LABELS: Record<string, string> = Object.fromEntries(D_STATUS.map((s) => [s.value, s.label]));
const D_COLORS: Record<string, string> = {
  created: "bg-muted text-foreground/85 border-border",
  picked_up: "bg-orange-500/12 text-orange-400 border-orange-500/25",
  in_transit: "bg-violet-500/12 text-violet-400 border-violet-500/25",
  out_for_delivery: "bg-blue-500/12 text-blue-400 border-blue-500/25",
  delivered: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  failed: "bg-amber-500/12 text-amber-400 border-amber-500/25",
  returned: "bg-red-500/12 text-red-400 border-red-500/25",
};

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listDeliveries);
  const save = useServerFn(saveDelivery);
  const remove = useServerFn(deleteDelivery);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-deliveries"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [values, setValues] = useState<FormValues>({});
  const [toDelete, setToDelete] = useState<string | null>(null);

  const invalidate = () => {
    ["zoric-deliveries", "zoric-orders", "zoric-overview", "zoric-reports", "zoric-finance"]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const saveMut = useMutation({
    mutationFn: (v: FormValues) => save({
      data: {
        id: editId,
        values: {
          order_id: v["order_id"],
          partner_id: v["partner_id"] || null,
          tracking_code: String(v["tracking_code"] ?? "") || `TRK-${Date.now().toString().slice(-8)}`,
          status: v["status"] || "created",
          courier_name: v["courier_name"] || null,
          cod_amount: Number(v["cod_amount"] ?? 0),
          cod_collected: String(v["cod_collected"] ?? "no") === "yes",
        },
      },
    }),
    onSuccess: () => { invalidate(); setOpen(false); toast.success("Livraison enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; row: Record<string, unknown> }) => save({ data: { id: v.id, values: v.row } }),
    onSuccess: () => { invalidate(); toast.success("Statut mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Livraison supprimée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => (data?.deliveries ?? []).filter((d) => {
    const o = d.zoric_orders as { order_code?: string; customer_name?: string; wilaya?: string } | null;
    const ok = `${d.tracking_code} ${o?.order_code ?? ""} ${o?.customer_name ?? ""} ${o?.wilaya ?? ""}`
      .toLowerCase().includes(search.toLowerCase());
    return ok && (filter === "all" || d.status === filter);
  }), [data, search, filter]);

  const kpis = useMemo(() => {
    const list = data?.deliveries ?? [];
    const inTransit = list.filter((d) => ["picked_up", "in_transit", "out_for_delivery"].includes(d.status)).length;
    const delivered = list.filter((d) => d.status === "delivered").length;
    const cash = list.filter((d) => d.cod_collected).reduce((s, d) => s + Number(d.cod_amount ?? 0), 0);
    const pending = list.filter((d) => !d.cod_collected).reduce((s, d) => s + Number(d.cod_amount ?? 0), 0);
    return { inTransit, delivered, cash, pending };
  }, [data]);

  const orderOptions = (data?.orders ?? []).map((o) => ({
    value: o.id, label: `${o.order_code} — ${o.customer_name} (${fmtDZD(Number(o.total))})`,
  }));
  const partnerOptions = (data?.partners ?? []).map((p) => ({ value: p.id, label: p.name }));

  const openNew = () => {
    setEditId(undefined);
    setValues({ order_id: "", partner_id: "", tracking_code: "", status: "created", courier_name: "", cod_amount: 0, cod_collected: "no" });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const d = data?.deliveries.find((x) => x.id === id);
    if (!d) return;
    setEditId(id);
    setValues({
      order_id: d.order_id, partner_id: d.partner_id ?? "", tracking_code: d.tracking_code,
      status: d.status, courier_name: d.courier_name ?? "",
      cod_amount: Number(d.cod_amount), cod_collected: d.cod_collected ? "yes" : "no",
    });
    setOpen(true);
  };

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Livraisons" subtitle="Le statut d'un colis met automatiquement à jour la commande liée.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ZoricKPI label="Colis en transit" value={String(kpis.inTransit)} icon={Truck} iconBg="bg-blue-500/12 text-primary" />
        <ZoricKPI label="Colis livrés" value={String(kpis.delivered)} icon={PackageCheck} iconBg="bg-emerald-500/12 text-emerald-400" />
        <ZoricKPI label="Cash encaissé" value={fmtDZD(kpis.cash)} icon={Banknote} iconBg="bg-emerald-500/12 text-emerald-400" />
        <ZoricKPI label="Cash en attente" value={fmtDZD(kpis.pending)} icon={Clock} iconBg="bg-amber-500/12 text-amber-400" />
      </div>

      <Toolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Nouvelle expédition" placeholder="Rechercher (tracking, commande, client)…">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {D_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Toolbar>

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucune expédition" hint="Créez une expédition à partir d'une commande pour suivre le colis et le cash à encaisser."
          action={<Button className="bg-primary" onClick={openNew}>Créer une expédition</Button>} />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Tracking</TableHead>
                  <TableHead>Commande</TableHead>
                  <TableHead className="hidden md:table-cell">Transporteur</TableHead>
                  <TableHead className="text-right">COD</TableHead>
                  <TableHead className="hidden sm:table-cell">Maj</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => {
                  const o = d.zoric_orders as { order_code?: string; customer_name?: string; wilaya?: string } | null;
                  const partner = data?.partners.find((p) => p.id === d.partner_id);
                  return (
                    <TableRow key={d.id}>
                      <SelectCell selection={selection} id={d.id} />
                      <TableCell className="font-medium text-foreground">{d.tracking_code}</TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{o?.order_code ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o?.customer_name} · {o?.wilaya ?? "—"}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{partner?.name ?? d.courier_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{fmtDZD(Number(d.cod_amount))}</div>
                        <div className={`text-xs ${d.cod_collected ? "text-emerald-400" : "text-amber-400"}`}>
                          {d.cod_collected ? "Encaissé" : "En attente"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{fmtDate(d.last_update)}</TableCell>
                      <TableCell>
                        <Select
                          value={d.status}
                          onValueChange={(v) => statusMut.mutate({
                            id: d.id,
                            row: {
                              order_id: d.order_id, partner_id: d.partner_id, tracking_code: d.tracking_code,
                              status: v, courier_name: d.courier_name, cod_amount: d.cod_amount,
                              cod_collected: v === "delivered" ? true : d.cod_collected,
                            },
                          })}
                        >
                          <SelectTrigger className="h-8 w-[150px] border-0 p-0 shadow-none focus:ring-0">
                            <Badge variant="outline" className={`${D_COLORS[d.status]} font-normal`}>{D_LABELS[d.status] ?? d.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {D_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d.id)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(d.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        title={editId ? "Modifier l'expédition" : "Nouvelle expédition"}
        description="Le montant COD est pré-rempli avec le total de la commande choisie."
        values={values}
        submitting={saveMut.isPending}
        onSubmit={(v) => saveMut.mutate(v)}
        fields={[
          { name: "order_id", label: "Commande", type: "select", options: orderOptions, half: false },
          { name: "partner_id", label: "Transporteur", type: "select", options: partnerOptions },
          { name: "tracking_code", label: "Code de suivi", placeholder: "Auto si vide" },
          { name: "status", label: "Statut", type: "select", options: D_STATUS },
          { name: "courier_name", label: "Livreur (optionnel)" },
          { name: "cod_amount", label: "Montant COD (DZD)", type: "number" },
          {
            name: "cod_collected", label: "Cash encaissé ?", type: "select",
            options: [{ value: "no", label: "Non" }, { value: "yes", label: "Oui" }],
          },
        ]}
      />

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }}
        label="Cette expédition sera supprimée. La commande reste inchangée." />
      <BulkBar
        selection={selection}
        entity="deliveries"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-deliveries", "zoric-orders"]}
        markOptions={[{ field: "status", value: "pending", label: "En attente" }, { field: "status", value: "shipped", label: "Expédiée" }, { field: "status", value: "delivered", label: "Livrée" }, { field: "status", value: "returned", label: "Retournée" }]}
        allowDuplicate={true}
        exportName="livraisons"
      />

    </ZoricShell>
  );
}
