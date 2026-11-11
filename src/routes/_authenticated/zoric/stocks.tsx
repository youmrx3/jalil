import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { ZoricShell, StatusPill } from "@/components/zoric/shell";
import { EntityDialog, Toolbar, EmptyState, type FormValues } from "@/components/zoric/crud";
import { listStock, adjustStock, setReorderLevel } from "@/lib/zoric/data.functions";
import { fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/stocks")({
  head: () => ({
    meta: [
      { title: "Stocks — Zoric Commerce OS" },
      { name: "description", content: "Suivi du stock en temps réel, entrées, sorties et seuils d'alerte." },
      { property: "og:title", content: "Stocks — Zoric Commerce OS" },
      { property: "og:description", content: "Inventaire temps réel de votre boutique COD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const REASONS = [
  { value: "purchase", label: "Achat / réapprovisionnement" },
  { value: "adjustment", label: "Ajustement d'inventaire" },
  { value: "damage", label: "Casse / perte" },
  { value: "return", label: "Retour en stock" },
];

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listStock);
  const adjust = useServerFn(adjustStock);
  const setLevel = useServerFn(setReorderLevel);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-stock"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; productId?: string; name?: string; sign: 1 | -1 }>({ open: false, sign: 1 });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["zoric-stock"] });
    qc.invalidateQueries({ queryKey: ["zoric-products"] });
  };

  const adjustMut = useMutation({
    mutationFn: (v: { productId: string; quantity: number; reason: string; note?: string }) => adjust({ data: v }),
    onSuccess: () => { invalidate(); setDialog({ open: false, sign: 1 }); toast.success("Mouvement de stock enregistré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const levelMut = useMutation({
    mutationFn: (v: { id: string; level: number }) => setLevel({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(
    () => (data?.inventory ?? []).filter((i) =>
      (i.zoric_products?.name ?? "").toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  const selection = useSelection(rows.map((r) => r.product_id));

  return (
    <ZoricShell title="Stocks" subtitle="Chaque commande déduit automatiquement le stock disponible.">
      <Toolbar search={search} onSearch={setSearch} placeholder="Rechercher un produit…" />

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucun stock" hint="Ajoutez d'abord des produits dans la section Produits pour suivre leur inventaire." />
      ) : (
        <>
          <Card className="border-border overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SelectAllHead selection={selection} />
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Réservé</TableHead>
                    <TableHead className="text-right">Seuil d'alerte</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Mouvement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => {
                    const low = Number(i.available) <= Number(i.reorder_level);
                    return (
                      <TableRow key={i.id}>
                        <SelectCell selection={selection} id={i.product_id} />
                        <TableCell className="font-medium text-foreground">{i.zoric_products?.name ?? "—"}</TableCell>
                        <TableCell className={`text-right font-semibold ${low ? "text-red-400" : ""}`}>{i.available}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{i.reserved}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            defaultValue={i.reorder_level}
                            className="h-8 w-20 ml-auto text-right"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== i.reorder_level) levelMut.mutate({ id: i.id, level: v });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusPill status={low ? "error" : "success"} label={low ? "Stock faible" : "OK"} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" title="Entrée de stock"
                            onClick={() => setDialog({ open: true, productId: i.product_id, name: i.zoric_products?.name, sign: 1 })}>
                            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Sortie de stock"
                            onClick={() => setDialog({ open: true, productId: i.product_id, name: i.zoric_products?.name, sign: -1 })}>
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-5 border-border rounded-2xl">
            <h3 className="font-semibold text-foreground mb-3">Derniers mouvements</h3>
            {(data?.movements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun mouvement pour le moment.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(data?.movements ?? []).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 text-sm border-b border-border pb-2">
                    <span className={`font-semibold w-12 ${m.quantity >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m.quantity >= 0 ? "+" : ""}{m.quantity}
                    </span>
                    <span className="font-medium text-foreground/85 truncate max-w-[180px]">{m.zoric_products?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{m.note ?? m.reason}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{fmtDate(m.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <EntityDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        title={dialog.sign === 1 ? `Entrée de stock — ${dialog.name ?? ""}` : `Sortie de stock — ${dialog.name ?? ""}`}
        fields={[
          { name: "quantity", label: "Quantité", type: "number", step: "1", required: true },
          { name: "reason", label: "Motif", type: "select", options: REASONS },
          { name: "note", label: "Note", type: "textarea" },
        ]}
        values={{ quantity: 1, reason: dialog.sign === 1 ? "purchase" : "adjustment", note: "" } as FormValues}
        submitting={adjustMut.isPending}
        onSubmit={(v) => {
          if (!dialog.productId) return;
          adjustMut.mutate({
            productId: dialog.productId,
            quantity: dialog.sign * Math.abs(Number(v["quantity"] ?? 0)),
            reason: String(v["reason"] ?? "adjustment"),
            note: String(v["note"] ?? ""),
          });
        }}
      />
      <BulkBar
        selection={selection}
        entity="products"
        rows={rows.map((r) => ({ ...r, id: r.product_id }))}
        queryKeys={["zoric-stock", "zoric-products"]}
        markOptions={[{ field: "status", value: "active", label: "Produit actif" }, { field: "status", value: "archived", label: "Produit archivé" }]}
        allowDuplicate={false}
        exportName="stocks"
      />
    </ZoricShell>
  );
}
