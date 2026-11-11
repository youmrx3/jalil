import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, X, FileSpreadsheet, Download, Plus } from "lucide-react";
import { DispatchBoard } from "@/components/zoric/dispatch-board";
import { exportCSV } from "@/lib/zoric/csv";
import { ZoricShell } from "@/components/zoric/shell";
import { Toolbar, EmptyState, ConfirmDelete } from "@/components/zoric/crud";
import { OrderImportDialog } from "@/components/zoric/order-import";
import { listOrders, saveOrder, updateOrderStatus, deleteOrder, getSettings } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD, fmtDate, STATUS_LABELS, STATUS_COLORS } from "@/lib/zoric/format";
import { WILAYAS, communesOf } from "@/lib/zoric/algeria";


export const Route = createFileRoute("/_authenticated/zoric/commandes")({
  head: () => ({
    meta: [
      { title: "Commandes — Zoric Commerce OS" },
      { name: "description", content: "Créez, confirmez et suivez toutes vos commandes COD." },
      { property: "og:title", content: "Commandes — Zoric Commerce OS" },
      { property: "og:description", content: "Pipeline complet de vos commandes en paiement à la livraison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new ? 1 : undefined } as { new?: 1 }),
  component: Page,
});

type Item = { product_id: string | null; product_name: string; quantity: number; unit_price: number; unit_cost: number };

const STATUSES = Object.keys(STATUS_LABELS);

const emptyForm = () => ({
  order_code: "",
  customer_name: "",
  customer_phone: "",
  wilaya: "",
  city: "",
  address: "",
  status: "new",
  delivery_cost: 0,
  delivery_type: "home",
  return_cost: 0,
  payment_method: "cod",
  source: "",
  order_date: new Date().toISOString().slice(0, 10),
  internal_note: "",
});


function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listOrders);
  const save = useServerFn(saveOrder);
  const setStatus = useServerFn(updateOrderStatus);
  const remove = useServerFn(deleteOrder);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-orders"], queryFn: () => fetchAll() });
  const fetchSettings = useServerFn(getSettings);
  const { data: settings } = useQuery({ queryKey: ["zoric", "settings"], queryFn: () => fetchSettings() });
  const defaultDelivery = Number((settings?.store as { default_delivery_cost?: number } | null)?.default_delivery_cost ?? 0);
  const rateFor = (wilaya: string) => (data?.rates ?? []).find((r) => r.wilaya_name === wilaya);
  const applyRate = (wilaya: string, type: string) => {
    const r = rateFor(wilaya);
    if (!r) return {};
    return {
      delivery_cost: Number(type === "stopdesk" ? r.stopdesk_price : r.home_price),
      return_cost: Number(r.return_price),
    };
  };

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState(emptyForm());
  const [items, setItems] = useState<Item[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<"board" | "all">("board");
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["zoric-orders"] });
    qc.invalidateQueries({ queryKey: ["zoric-stock"] });
    qc.invalidateQueries({ queryKey: ["zoric-overview"] });
    qc.invalidateQueries({ queryKey: ["zoric-products"] });
    qc.invalidateQueries({ queryKey: ["zoric-customers"] });
    qc.invalidateQueries({ queryKey: ["zoric-dashboard"] });
  };

  const saveMut = useMutation({
    mutationFn: () => save({ data: { id: editId, values: { ...form, delivery_cost: Number(form.delivery_cost) }, items } }),
    onSuccess: () => { invalidate(); setOpen(false); toast.success("Commande enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: string }) => setStatus({ data: v }),
    onSuccess: () => { invalidate(); toast.success("Statut mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Commande supprimée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => (data?.orders ?? []).filter((o) => {
    const okSearch = `${o.order_code} ${o.customer_name} ${o.customer_phone} ${o.wilaya ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return okSearch && (filter === "all" || o.status === filter);
  }), [data, search, filter]);

  const openNew = () => {
    setEditId(undefined);
    setForm({ ...emptyForm(), delivery_cost: defaultDelivery });
    setItems([]);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const o = data?.orders.find((x) => x.id === id);
    if (!o) return;
    setEditId(id);
    setForm({
      order_code: o.order_code, customer_name: o.customer_name, customer_phone: o.customer_phone,
      wilaya: o.wilaya ?? "", city: o.city ?? "", address: o.address ?? "", status: o.status,
      delivery_cost: Number(o.delivery_cost), payment_method: o.payment_method, source: o.source ?? "",
      order_date: o.order_date, internal_note: o.internal_note ?? "",
      delivery_type: (o as { delivery_type?: string }).delivery_type ?? "home",
      return_cost: Number((o as { return_cost?: number }).return_cost ?? 0),
    });

    setItems((data?.items ?? []).filter((i) => i.order_id === id).map((i) => ({
      product_id: i.product_id, product_name: i.product_name, quantity: i.quantity,
      unit_price: Number(i.unit_price), unit_cost: Number(i.unit_cost),
    })));
    setOpen(true);
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const cost = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const total = subtotal + Number(form.delivery_cost || 0);

  const selection = useSelection(rows.map((r) => r.id));

  // "Nouvelle commande" button in the sidebar links here with ?new=1
  useEffect(() => {
    if (searchParams.new && data) {
      openNew();
      navigate({ search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.new, data]);

  const toPack = (data?.orders ?? []).filter((o) => ["new", "to_confirm", "confirmed", "prepared"].includes(o.status)).length;
  const since10 = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const last10 = (data?.orders ?? []).filter((o) => o.order_date >= since10).length;

  return (
    <ZoricShell
      title="Commandes"
      subtitle={`${toPack} commandes à préparer et expédier · ${last10} sur les 10 derniers jours`}
      actions={<>
        <Button variant="outline" className="rounded-xl" onClick={() => exportCSV("commandes.csv", rows.map((o) => ({
          code: o.order_code, client: o.customer_name, telephone: o.customer_phone, wilaya: o.wilaya ?? "",
          statut: STATUS_LABELS[o.status] ?? o.status, total: Number(o.total), date: o.order_date, source: o.source ?? "",
        })))}><Download className="h-4 w-4 mr-1.5" /> Exporter</Button>
        <Button className="rounded-xl bg-ember-gradient text-white hover:opacity-95" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nouvelle commande</Button>
      </>}
    >
      <div className="flex items-center gap-6 border-b border-border mb-5 text-[13px]">
        {([["board", "Tableau de dispatch", toPack], ["all", "Toutes les commandes", data?.orders.length ?? 0]] as const).map(([k, label, n]) => (
          <button key={k} onClick={() => setView(k)} className={`relative pb-3 font-medium transition flex items-center gap-2 ${view === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
            <span className={`text-[10.5px] px-1.5 rounded-md tabular ${view === k ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{n}</span>
            {view === k && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {view === "board" ? (isLoading ? <Skeleton className="h-96" /> : (
        <DispatchBoard
          orders={(data?.orders ?? []) as never}
          items={(data?.items ?? []) as never}
          busyId={statusMut.isPending ? statusMut.variables?.id : null}
          onAdvance={(id, status) => statusMut.mutate({ id, status })}
          onOpen={openEdit}
        />
      )) : (<>
      <Toolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Nouvelle commande" placeholder="Rechercher (code, client, téléphone)…">
        <Button variant="outline" className="rounded-full w-full sm:w-auto" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Importer CRM
        </Button>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Toolbar>

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucune commande" hint="Créez votre première commande : le stock des produits sélectionnés sera automatiquement déduit."
          action={<Button className="bg-primary" onClick={openNew}>Créer une commande</Button>} />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Wilaya</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Bénéfice</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <SelectCell selection={selection} id={o.id} />
                    <TableCell className="font-medium text-foreground">{o.order_code}</TableCell>
                    <TableCell>
                      <div className="text-sm">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{o.wilaya ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmtDZD(Number(o.total))}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-emerald-400">{fmtDZD(Number(o.estimated_profit))}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{fmtDate(o.order_date)}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => statusMut.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="h-8 w-[140px] border-0 p-0 shadow-none focus:ring-0">
                          <Badge variant="outline" className={`${STATUS_COLORS[o.status]} font-normal`}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(o.id)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(o.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      </>)}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier la commande" : "Nouvelle commande"}</DialogTitle>
            <DialogDescription>Choisissez un produit : le prix de vente et le coût sont repris automatiquement de la fiche produit. Le stock est déduit à la création.</DialogDescription>
          </DialogHeader>

          {/* 1. Produits */}
          <div className="rounded-xl border border-border p-4">
            <h4 className="font-semibold text-sm text-foreground mb-2">1. Produits commandés</h4>
            <Select
              value=""
              onValueChange={(v) => {
                const p = data?.products.find((x) => x.id === v);
                if (!p) return;
                const idx = items.findIndex((i) => i.product_id === v);
                if (idx >= 0) {
                  const n = [...items];
                  n[idx] = { ...n[idx], quantity: n[idx].quantity + 1 };
                  setItems(n);
                } else {
                  setItems([...items, {
                    product_id: p.id, product_name: p.name, quantity: 1,
                    unit_price: Number(p.selling_price ?? 0),
                    unit_cost: Number(p.product_cost ?? 0) + Number(p.packaging_cost ?? 0),
                  }]);
                }
              }}
            >
              <SelectTrigger className="bg-card"><SelectValue placeholder="Choisir un produit à ajouter…" /></SelectTrigger>
              <SelectContent>
                {(data?.products ?? []).map((p) => {
                  const stock = (data?.inventory ?? []).filter((v) => v.product_id === p.id)
                    .reduce((s2, v) => s2 + Number(v.available ?? 0), 0);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmtDZD(Number(p.selling_price))} · stock {stock}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="mt-3 space-y-2">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun produit sélectionné pour l'instant.</p>
              )}
              {items.map((it, idx) => {
                const stock = (data?.inventory ?? []).filter((v) => v.product_id === it.product_id)
                  .reduce((s2, v) => s2 + Number(v.available ?? 0), 0);
                return (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted border border-border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-foreground truncate">{it.product_name || "Produit"}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDZD(it.unit_price)} / unité · coût {fmtDZD(it.unit_cost)} · stock {stock}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => { const n = [...items]; n[idx] = { ...it, quantity: Math.max(1, it.quantity - 1) }; setItems(n); }}>−</Button>
                      <Input className="h-8 w-14 text-center" type="number" step="1" min="1" value={it.quantity}
                        onChange={(e) => { const n = [...items]; n[idx] = { ...it, quantity: Math.max(1, Number(e.target.value) || 1) }; setItems(n); }} />
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => { const n = [...items]; n[idx] = { ...it, quantity: it.quantity + 1 }; setItems(n); }}>+</Button>
                    </div>
                    <div className="w-24 text-right font-semibold text-sm shrink-0 hidden sm:block">
                      {fmtDZD(it.quantity * it.unit_price)}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="shrink-0"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}><X className="h-4 w-4 text-red-500" /></Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Client & livraison */}
          <div className="rounded-xl border border-border p-4 mt-4">
            <h4 className="font-semibold text-sm text-foreground mb-3">2. Client & livraison</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">Nom du client</Label>
                <Input className="mt-1" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label className="text-xs">Téléphone</Label>
                <Input className="mt-1" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              <div><Label className="text-xs">Wilaya</Label>
                <Select value={form.wilaya} onValueChange={(v) => setForm({ ...form, wilaya: v, city: "", ...applyRate(v, form.delivery_type) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une wilaya" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {WILAYAS.map((w) => <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Commune (sous-wilaya)</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })} disabled={!form.wilaya}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={form.wilaya ? "Choisir une commune" : "Choisir d'abord la wilaya"} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {communesOf(form.wilaya).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="sm:col-span-2"><Label className="text-xs">Adresse</Label>
                <Input className="mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label className="text-xs">Type de livraison</Label>
                <Select value={form.delivery_type} onValueChange={(v) => setForm({ ...form, delivery_type: v, ...applyRate(form.wilaya, v) })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">À domicile</SelectItem>
                    <SelectItem value="stopdesk">Stopdesk (bureau)</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label className="text-xs">Frais de livraison (DZD)</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.delivery_cost}
                  onChange={(e) => setForm({ ...form, delivery_cost: Number(e.target.value) })} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {rateFor(form.wilaya) ? "Tarif repris des Paramètres → Tarifs de livraison." : "Aucun tarif défini pour cette wilaya."}
                </p></div>
              <div><Label className="text-xs">Frais de retour (DZD)</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.return_cost}
                  onChange={(e) => setForm({ ...form, return_cost: Number(e.target.value) })} /></div>

              <div><Label className="text-xs">Date</Label>
                <Input type="date" className="mt-1" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
              <div><Label className="text-xs">Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Source</Label>
                <Input className="mt-1" placeholder="Facebook, TikTok…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Note interne</Label>
                <Textarea className="mt-1" value={form.internal_note} onChange={(e) => setForm({ ...form, internal_note: e.target.value })} /></div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-muted border border-border p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><div className="text-xs text-muted-foreground">Sous-total</div><div className="font-semibold">{fmtDZD(subtotal)}</div></div>
            <div><div className="text-xs text-muted-foreground">Coût produits</div><div className="font-semibold">{fmtDZD(cost)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total client</div><div className="font-semibold">{fmtDZD(total)}</div></div>
            <div><div className="text-xs text-muted-foreground">Bénéfice estimé</div><div className="font-semibold text-emerald-400">{fmtDZD(subtotal - cost)}</div></div>
          </div>


          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="bg-primary hover:bg-ember-deep" disabled={saveMut.isPending || !form.customer_name || !form.customer_phone}
              onClick={() => saveMut.mutate()}>{saveMut.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }}
        label="La commande, ses articles, livraisons et retours associés seront supprimés." />
          <OrderImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        productNames={(data?.products ?? []).flatMap((p) => [p.name, p.sku ?? ""]).filter(Boolean)}
        onDone={invalidate}
      />
      <BulkBar
        selection={selection}
        entity="orders"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-orders"]}
        markOptions={[{ field: "status", value: "new", label: "Nouvelle" }, { field: "status", value: "confirmed", label: "Confirmée" }, { field: "status", value: "shipped", label: "Expédiée" }, { field: "status", value: "delivered", label: "Livrée" }, { field: "status", value: "returned", label: "Retournée" }, { field: "status", value: "cancelled", label: "Annulée" }]}
        allowDuplicate={true}
        exportName="commandes"
      />

</ZoricShell>
  );
}
