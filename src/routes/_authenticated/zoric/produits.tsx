import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Package } from "lucide-react";
import { ZoricShell, StatusPill } from "@/components/zoric/shell";
import { EntityDialog, Toolbar, EmptyState, ConfirmDelete, type FieldDef, type FormValues } from "@/components/zoric/crud";
import { listProducts, saveProduct, deleteProduct } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/produits")({
  head: () => ({
    meta: [
      { title: "Produits — Zoric Commerce OS" },
      { name: "description", content: "Gérez votre catalogue produits, prix, coûts et marges." },
      { property: "og:title", content: "Produits — Zoric Commerce OS" },
      { property: "og:description", content: "Catalogue, coûts et marges de votre boutique COD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const FIELDS: FieldDef[] = [
  { name: "name", label: "Nom du produit", required: true, half: false },
  { name: "sku", label: "Code produit (SKU)", placeholder: "Ex : MTR-001" },
  { name: "category", label: "Catégorie", placeholder: "Ex : Beauté" },
  { name: "selling_price", label: "Prix de vente (DZD)", type: "number", required: true },
  { name: "product_cost", label: "Coût d'achat (DZD)", type: "number", required: true },
  { name: "packaging_cost", label: "Coût emballage (DZD)", type: "number" },
  { name: "supplier", label: "Fournisseur" },
  { name: "status", label: "Statut", type: "select", options: [
    { value: "active", label: "Actif" }, { value: "draft", label: "Brouillon" }, { value: "archived", label: "Archivé" },
  ] },
  { name: "image_url", label: "URL de l'image", half: false },
  { name: "description", label: "Description", type: "textarea" },
];

const EMPTY: FormValues = {
  name: "", sku: "", category: "", selling_price: "", product_cost: "", packaging_cost: 0,
  supplier: "", status: "active", image_url: "", description: "", initial_stock: 0,
};

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listProducts);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-products"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; values: FormValues }>({ open: false, values: EMPTY });
  const [toDelete, setToDelete] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["zoric-products"] });
    qc.invalidateQueries({ queryKey: ["zoric-stock"] });
    qc.invalidateQueries({ queryKey: ["zoric-overview"] });
  };

  const saveMut = useMutation({
    mutationFn: (v: { id?: string; values: FormValues }) => {
      const { initial_stock, ...rest } = v.values;
      const clean: Record<string, unknown> = {};
      Object.entries(rest).forEach(([k, val]) => { clean[k] = val === "" ? null : val; });
      ["selling_price", "product_cost", "packaging_cost"].forEach((k) => { clean[k] = Number(clean[k] ?? 0); });
      return save({ data: { id: v.id, values: clean, initialStock: Number(initial_stock ?? 0) } });
    },
    onSuccess: () => { invalidate(); setDialog({ open: false, values: EMPTY }); toast.success("Produit enregistré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Produit supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const stock: Record<string, number> = {};
    (data?.inventory ?? []).forEach((i) => { stock[i.product_id] = (stock[i.product_id] ?? 0) + Number(i.available); });
    return (data?.products ?? [])
      .filter((p) => `${p.name} ${p.sku ?? ""} ${p.category ?? ""}`.toLowerCase().includes(search.toLowerCase()))
      .map((p) => ({ ...p, stock: stock[p.id] ?? 0 }));
  }, [data, search]);

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Produits" subtitle="Votre catalogue, vos coûts réels et vos marges.">
      <Toolbar search={search} onSearch={setSearch} onAdd={() => setDialog({ open: true, values: EMPTY })} addLabel="Nouveau produit" placeholder="Rechercher un produit…" />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucun produit"
          hint="Ajoutez votre premier produit avec son prix de vente et ses coûts pour suivre vos marges automatiquement."
          action={<Button className="bg-primary" onClick={() => setDialog({ open: true, values: EMPTY })}>Ajouter un produit</Button>}
        />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Produit</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Coût total</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const cost = Number(p.product_cost) + Number(p.packaging_cost);
                  const margin = Number(p.selling_price) - cost;
                  return (
                    <TableRow key={p.id}>
                      <SelectCell selection={selection} id={p.id} />
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-500/12 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate max-w-[180px]">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.sku ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.category ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{fmtDZD(Number(p.selling_price))}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">{fmtDZD(cost)}</TableCell>
                      <TableCell className={`text-right font-semibold ${margin > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtDZD(margin)}</TableCell>
                      <TableCell className="text-right">
                        <span className={p.stock <= 5 ? "text-red-400 font-semibold" : "text-foreground/85"}>{p.stock}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusPill status={p.status === "active" ? "success" : "neutral"} label={p.status === "active" ? "Actif" : p.status === "draft" ? "Brouillon" : "Archivé"} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => setDialog({
                          open: true, id: p.id,
                          values: {
                            name: p.name, sku: p.sku ?? "", category: p.category ?? "",
                            selling_price: Number(p.selling_price), product_cost: Number(p.product_cost),
                            packaging_cost: Number(p.packaging_cost), supplier: p.supplier ?? "",
                            status: p.status, image_url: p.image_url ?? "", description: p.description ?? "", initial_stock: 0,
                          },
                        })}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        title={dialog.id ? "Modifier le produit" : "Nouveau produit"}
        description="Le coût total = coût d'achat + emballage. La marge est calculée automatiquement."
        fields={dialog.id ? FIELDS : [...FIELDS, { name: "initial_stock", label: "Stock initial", type: "number", step: "1" }]}
        values={dialog.values}
        submitting={saveMut.isPending}
        onSubmit={(v) => saveMut.mutate({ id: dialog.id, values: v })}
      />

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }}
        label="Le produit, son stock et ses mouvements seront supprimés."
      />
      <BulkBar
        selection={selection}
        entity="products"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-products"]}
        markOptions={[{ field: "status", value: "active", label: "Actif" }, { field: "status", value: "draft", label: "Brouillon" }, { field: "status", value: "archived", label: "Archivé" }]}
        allowDuplicate={true}
        exportName="produits"
      />

    </ZoricShell>
  );
}
