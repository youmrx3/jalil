import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { ZoricShell, StatusPill } from "@/components/zoric/shell";
import { EntityDialog, Toolbar, EmptyState, ConfirmDelete, type FieldDef, type FormValues } from "@/components/zoric/crud";
import { listCustomers, saveCustomer, deleteCustomer } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Zoric Commerce OS" },
      { name: "description", content: "Fiches clients, historique de commandes et niveau de risque." },
      { property: "og:title", content: "Clients — Zoric Commerce OS" },
      { property: "og:description", content: "Gérez votre base clients COD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const FIELDS: FieldDef[] = [
  { name: "full_name", label: "Nom complet", required: true },
  { name: "phone", label: "Téléphone", required: true },
  { name: "email", label: "Email" },
  { name: "wilaya", label: "Wilaya" },
  { name: "city", label: "Commune" },
  { name: "risk_level", label: "Niveau de risque", type: "select", options: [
    { value: "low", label: "Faible" }, { value: "medium", label: "Moyen" }, { value: "high", label: "Élevé" },
  ] },
  { name: "address", label: "Adresse", half: false },
  { name: "notes", label: "Notes", type: "textarea" },
];

const EMPTY: FormValues = { full_name: "", phone: "", email: "", wilaya: "", city: "", risk_level: "low", address: "", notes: "" };

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listCustomers);
  const save = useServerFn(saveCustomer);
  const remove = useServerFn(deleteCustomer);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-customers"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; values: FormValues }>({ open: false, values: EMPTY });
  const [toDelete, setToDelete] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: (v: { id?: string; values: FormValues }) => {
      const clean: Record<string, unknown> = {};
      Object.entries(v.values).forEach(([k, val]) => { clean[k] = val === "" ? null : val; });
      return save({ data: { id: v.id, values: clean } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["zoric-customers"] }); setDialog({ open: false, values: EMPTY }); toast.success("Client enregistré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["zoric-customers"] }); toast.success("Client supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(
    () => (data ?? []).filter((c) => `${c.full_name} ${c.phone} ${c.wilaya ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Clients" subtitle="Votre base clients et leur historique COD.">
      <Toolbar search={search} onSearch={setSearch} onAdd={() => setDialog({ open: true, values: EMPTY })} addLabel="Nouveau client" placeholder="Rechercher un client…" />

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucun client" hint="Les clients ajoutés ici seront disponibles lors de la création d'une commande." />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Wilaya</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Commandes</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Livrées</TableHead>
                  <TableHead className="text-right">Total dépensé</TableHead>
                  <TableHead className="hidden sm:table-cell">Risque</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <SelectCell selection={selection} id={c.id} />
                    <TableCell>
                      <div className="font-medium text-foreground">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.wilaya ?? "—"}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{c.total_orders}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{c.delivered_orders}</TableCell>
                    <TableCell className="text-right font-medium">{fmtDZD(Number(c.total_spent))}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill
                        status={c.risk_level === "high" ? "error" : c.risk_level === "medium" ? "warning" : "success"}
                        label={c.risk_level === "high" ? "Élevé" : c.risk_level === "medium" ? "Moyen" : "Faible"}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setDialog({
                        open: true, id: c.id,
                        values: {
                          full_name: c.full_name, phone: c.phone, email: c.email ?? "", wilaya: c.wilaya ?? "",
                          city: c.city ?? "", risk_level: c.risk_level ?? "low", address: c.address ?? "", notes: c.notes ?? "",
                        },
                      })}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <EntityDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        title={dialog.id ? "Modifier le client" : "Nouveau client"}
        fields={FIELDS}
        values={dialog.values}
        submitting={saveMut.isPending}
        onSubmit={(v) => saveMut.mutate({ id: dialog.id, values: v })}
      />
      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }} />
      <BulkBar
        selection={selection}
        entity="customers"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-customers"]}
        markOptions={[{ field: "risk_level", value: "low", label: "Risque faible" }, { field: "risk_level", value: "medium", label: "Risque moyen" }, { field: "risk_level", value: "high", label: "Risque élevé" }]}
        allowDuplicate={true}
        exportName="clients"
      />

    </ZoricShell>
  );
}
