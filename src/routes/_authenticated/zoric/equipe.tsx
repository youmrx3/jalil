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
import { Pencil, Trash2, Users, ShieldCheck, MailCheck, UserPlus } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { ZoricKPI } from "@/components/zoric/kpi-card";
import { Toolbar, EmptyState, ConfirmDelete, EntityDialog, type FormValues } from "@/components/zoric/crud";
import { getSettings, saveMember, deleteMember } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/equipe")({
  head: () => ({
    meta: [
      { title: "Équipe — Zoric Commerce OS" },
      { name: "description", content: "Invitez vos collaborateurs et gérez leurs rôles et permissions." },
      { property: "og:title", content: "Équipe — Zoric Commerce OS" },
      { property: "og:description", content: "Rôles, invitations et permissions de votre équipe boutique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const ROLES = [
  { value: "owner", label: "Propriétaire", desc: "Accès total, facturation incluse" },
  { value: "admin", label: "Administrateur", desc: "Gère tout sauf la facturation" },
  { value: "manager", label: "Manager", desc: "Commandes, stocks, clients" },
  { value: "media_buyer", label: "Media buyer", desc: "Publicités et rapports" },
  { value: "support", label: "Support", desc: "Confirmation des commandes" },
  { value: "delivery", label: "Livraison", desc: "Expéditions et statuts colis" },
  { value: "viewer", label: "Lecture seule", desc: "Consultation uniquement" },
];
const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-blue-500/12 text-primary border-blue-500/25",
  admin: "bg-orange-500/12 text-orange-400 border-orange-500/25",
  manager: "bg-sky-500/12 text-sky-400 border-sky-500/25",
  media_buyer: "bg-amber-500/12 text-amber-400 border-amber-500/25",
  support: "bg-violet-500/12 text-violet-400 border-violet-500/25",
  delivery: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  viewer: "bg-muted text-muted-foreground border-border",
};

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(getSettings);
  const save = useServerFn(saveMember);
  const remove = useServerFn(deleteMember);

  const { data, isLoading } = useQuery({ queryKey: ["zoric", "settings"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [values, setValues] = useState<FormValues>({});
  const [toDelete, setToDelete] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["zoric", "settings"] });

  const saveMut = useMutation({
    mutationFn: (v: FormValues) => save({ data: { id: editId, email: String(v["email"] ?? ""), role: String(v["role"] ?? "viewer") } }),
    onSuccess: () => { invalidate(); setOpen(false); toast.success(editId ? "Rôle mis à jour" : "Invitation enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Membre retiré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const members = data?.members ?? [];
  const rows = useMemo(() => members.filter((m) =>
    `${m.invited_email ?? ""} ${ROLE_LABELS[m.role] ?? m.role} ${m.status}`.toLowerCase().includes(search.toLowerCase())),
    [members, search]);

  const kpis = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    invited: members.filter((m) => m.status === "invited").length,
    admins: members.filter((m) => ["owner", "admin"].includes(m.role)).length,
  }), [members]);

  const openNew = () => { setEditId(undefined); setValues({ email: "", role: "manager" }); setOpen(true); };
  const openEdit = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    setEditId(id);
    setValues({ email: m.invited_email ?? "", role: m.role });
    setOpen(true);
  };

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Équipe" subtitle="Invitez vos collaborateurs et définissez précisément ce que chacun peut faire.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ZoricKPI label="Membres" value={String(kpis.total)} icon={Users} iconBg="bg-blue-500/12 text-primary" />
        <ZoricKPI label="Actifs" value={String(kpis.active)} icon={ShieldCheck} iconBg="bg-emerald-500/12 text-emerald-400" />
        <ZoricKPI label="Invitations en attente" value={String(kpis.invited)} icon={MailCheck} iconBg="bg-amber-500/12 text-amber-400" />
        <ZoricKPI label="Administrateurs" value={String(kpis.admins)} icon={UserPlus} iconBg="bg-orange-500/12 text-orange-400" />
      </div>

      <Toolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Inviter un membre" placeholder="Rechercher un membre…" />

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucun membre" hint="Invitez votre premier collaborateur et attribuez-lui un rôle."
          action={<Button className="bg-primary" onClick={openNew}>Inviter un membre</Button>} />
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Ajouté le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <SelectCell selection={selection} id={m.id} />
                    <TableCell>
                      <div className="font-medium text-foreground">{m.invited_email ?? (m.user_id === data?.userId ? "Vous" : "Membre")}</div>
                      <div className="text-xs text-muted-foreground">{m.user_id === data?.userId ? "Compte courant" : m.user_id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`${ROLE_COLORS[m.role]} font-normal`}>{ROLE_LABELS[m.role] ?? m.role}</Badge></TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${m.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                        {m.status === "active" ? "Actif" : "Invité"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m.id)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(m.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Card className="p-5 border-border mt-6">
        <h3 className="font-semibold text-foreground mb-3">Matrice des rôles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="rounded-lg border border-border p-3">
              <Badge variant="outline" className={`${ROLE_COLORS[r.value]} font-normal mb-1`}>{r.label}</Badge>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <EntityDialog
        open={open} onOpenChange={setOpen}
        title={editId ? "Modifier le rôle" : "Inviter un membre"}
        description="L'invité recevra l'accès à cette boutique avec le rôle choisi."
        values={values} submitting={saveMut.isPending} onSubmit={(v) => saveMut.mutate(v)}
        fields={[
          { name: "email", label: "E-mail", placeholder: "collaborateur@exemple.com", required: !editId },
          { name: "role", label: "Rôle", type: "select", options: ROLES.map((r) => ({ value: r.value, label: r.label })) },
        ]}
      />

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }}
        label="Ce membre perdra l'accès à la boutique." />
      <BulkBar
        selection={selection}
        entity="members"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-settings"]}
        markOptions={[{ field: "status", value: "active", label: "Actif" }, { field: "status", value: "invited", label: "Invité" }, { field: "status", value: "disabled", label: "Désactivé" }]}
        allowDuplicate={false}
        exportName="equipe"
      />

    </ZoricShell>
  );
}
