import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Pencil, Plus, RefreshCw, Star, Trash2, Truck } from "lucide-react";
import { ZoricShell } from "@/components/zoric/shell";
import { EntityDialog, ConfirmDelete, type FieldDef, type FormValues } from "@/components/zoric/crud";
import {
  getSettings, updateStore, saveBusinessProfile, deleteBusinessProfile,
  setDefaultBusinessProfile, savePartner, deletePartner, resyncWorkspace, purgeStoreData,
} from "@/lib/zoric/data.functions";
import { fmtDZD } from "@/lib/zoric/format";
import { ShippingRatesEditor } from "@/components/zoric/shipping-rates";


export const Route = createFileRoute("/_authenticated/zoric/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Zoric Commerce OS" },
      { name: "description", content: "Configurez votre boutique, la devise, la TVA, les profils de facturation et les partenaires de livraison." },
      { property: "og:title", content: "Paramètres — Zoric Commerce OS" },
      { property: "og:description", content: "Configuration complète de votre boutique COD : devise, taxes, livraison et profils métier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type StoreRow = Record<string, unknown> | null;

const PROFILE_FIELDS: FieldDef[] = [
  { name: "name", label: "Nom du profil", required: true, placeholder: "Ex. Profil principal" },
  { name: "legal_name", label: "Raison sociale", placeholder: "SARL / EURL …" },
  { name: "rc", label: "Registre de commerce (RC)" },
  { name: "nif", label: "NIF" },
  { name: "ai", label: "Article d'imposition (AI)" },
  { name: "nis", label: "NIS" },
  { name: "phone", label: "Téléphone" },
  { name: "email", label: "Email" },
  { name: "address", label: "Adresse", type: "textarea" },
  { name: "bank_details", label: "Banque / RIB / CCP", type: "textarea", placeholder: "Banque: BNA\nRIB: 001 00123 …" },
];

const PARTNER_FIELDS: FieldDef[] = [
  { name: "name", label: "Nom du transporteur", required: true, placeholder: "Yalidine, ZR Express…" },
  { name: "code", label: "Code", required: true, placeholder: "yalidine" },
  { name: "logo_url", label: "Logo (URL)" },
];

function Page() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const { data, isLoading } = useQuery({ queryKey: ["zoric", "settings"], queryFn: () => fetchSettings() });

  const saveStore = useServerFn(updateStore);
  const saveProfile = useServerFn(saveBusinessProfile);
  const delProfile = useServerFn(deleteBusinessProfile);
  const defProfile = useServerFn(setDefaultBusinessProfile);
  const savePart = useServerFn(savePartner);
  const delPart = useServerFn(deletePartner);
  const resync = useServerFn(resyncWorkspace);
  const purgeFn = useServerFn(purgeStoreData);

  const invalidate = () => {
    qc.invalidateQueries();
  };

  const store = (data?.store ?? null) as StoreRow;
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  useEffect(() => {
    if (!store) return;
    setForm({
      name: String(store["name"] ?? ""),
      contact_email: String(store["contact_email"] ?? ""),
      contact_phone: String(store["contact_phone"] ?? ""),
      address: String(store["address"] ?? ""),
      logo_url: String(store["logo_url"] ?? ""),
      currency: String(store["currency"] ?? "DZD"),
      currency_symbol: String(store["currency_symbol"] ?? "DZD"),
      timezone: String(store["timezone"] ?? "Africa/Algiers"),
      language: String(store["language"] ?? "fr"),
      tax_rate: Number(store["tax_rate"] ?? 0),
      tax_included: Boolean(store["tax_included"]),
      cod_fee: Number(store["cod_fee"] ?? 0),
      default_delivery_cost: Number(store["default_delivery_cost"] ?? 0),
      low_stock_threshold: Number(store["low_stock_threshold"] ?? 5),
      order_code_prefix: String(store["order_code_prefix"] ?? "CMD"),
      invoice_footer: String(store["invoice_footer"] ?? ""),
    });
  }, [store]);

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const storeMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => saveStore({ data: values }),
    onSuccess: () => { toast.success("Paramètres enregistrés"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resyncMutation = useMutation({
    mutationFn: () => resync(),
    onSuccess: (r) => {
      toast.success(`Synchronisation terminée — ${r.linked} commande(s) rattachée(s), seuil stock ${r.threshold}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [purge, setPurge] = useState<string[] | null>(null);
  const purgeMutation = useMutation({
    mutationFn: (scopes: string[]) => purgeFn({ data: { scopes } }),
    onSuccess: () => { toast.success("Données effacées"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  /* profiles */
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEdit, setProfileEdit] = useState<Record<string, unknown> | null>(null);
  const [profileDelete, setProfileDelete] = useState<string | null>(null);
  const profileMutation = useMutation({
    mutationFn: (v: FormValues) =>
      saveProfile({ data: { id: (profileEdit?.["id"] as string) ?? undefined, values: v as Record<string, unknown> } }),
    onSuccess: () => { toast.success("Profil enregistré"); setProfileOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  /* partners */
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerEdit, setPartnerEdit] = useState<Record<string, unknown> | null>(null);
  const [partnerDelete, setPartnerDelete] = useState<string | null>(null);
  const partnerMutation = useMutation({
    mutationFn: (v: FormValues) =>
      savePart({ data: { id: (partnerEdit?.["id"] as string) ?? undefined, values: { ...v, is_active: true } as Record<string, unknown> } }),
    onSuccess: () => { toast.success("Transporteur enregistré"); setPartnerOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = data?.orders ?? [];
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total ?? 0), 0);

  if (isLoading) {
    return (
      <ZoricShell title="Paramètres">
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      </ZoricShell>
    );
  }

  return (
    <ZoricShell title="Paramètres" subtitle="Configurez votre boutique, vos règles de calcul et vos profils de facturation.">
      <Tabs defaultValue="boutique" className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
          <TabsTrigger value="finance">Devise & taxes</TabsTrigger>
          <TabsTrigger value="operations">Opérations</TabsTrigger>
          <TabsTrigger value="profils">Profils métier</TabsTrigger>
          <TabsTrigger value="livraison">Transporteurs</TabsTrigger>
          <TabsTrigger value="tarifs">Tarifs livraison</TabsTrigger>
          <TabsTrigger value="sync">Synchronisation</TabsTrigger>
        </TabsList>

        <TabsContent value="tarifs">
          <ShippingRatesEditor rates={(data?.rates ?? []) as never} />
        </TabsContent>


        {/* ------------------------------- Boutique ------------------------------- */}
        <TabsContent value="boutique">
          <Card className="p-5 border-border max-w-3xl">
            <h3 className="font-semibold text-foreground mb-4">Identité de la boutique</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de la boutique"><Input value={String(form["name"] ?? "")} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Logo (URL)"><Input value={String(form["logo_url"] ?? "")} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" /></Field>
              <Field label="Email de contact"><Input value={String(form["contact_email"] ?? "")} onChange={(e) => set("contact_email", e.target.value)} /></Field>
              <Field label="Téléphone"><Input value={String(form["contact_phone"] ?? "")} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
              <Field label="Adresse" full><Textarea value={String(form["address"] ?? "")} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="Fuseau horaire">
                <Select value={String(form["timezone"] ?? "Africa/Algiers")} onValueChange={(v) => set("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Algiers">Africa/Algiers (GMT+1)</SelectItem>
                    <SelectItem value="Africa/Tunis">Africa/Tunis</SelectItem>
                    <SelectItem value="Africa/Casablanca">Africa/Casablanca</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Langue de l'interface">
                <Select value={String(form["language"] ?? "fr")} onValueChange={(v) => set("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <SaveBar onSave={() => storeMutation.mutate({
              name: form["name"], logo_url: form["logo_url"] || null, contact_email: form["contact_email"] || null,
              contact_phone: form["contact_phone"] || null, address: form["address"] || null,
              timezone: form["timezone"], language: form["language"],
            })} pending={storeMutation.isPending} />
          </Card>
        </TabsContent>

        {/* -------------------------- Devise & taxes ------------------------------ */}
        <TabsContent value="finance">
          <Card className="p-5 border-border max-w-3xl">
            <h3 className="font-semibold text-foreground mb-4">Devise & fiscalité</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Devise">
                <Select value={String(form["currency"] ?? "DZD")} onValueChange={(v) => { set("currency", v); set("currency_symbol", v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DZD">DZD — Dinar algérien</SelectItem>
                    <SelectItem value="MAD">MAD — Dirham marocain</SelectItem>
                    <SelectItem value="TND">TND — Dinar tunisien</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                    <SelectItem value="USD">USD — Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Symbole affiché"><Input value={String(form["currency_symbol"] ?? "")} onChange={(e) => set("currency_symbol", e.target.value)} /></Field>
              <Field label="Taux de TVA (%)" help="Appliqué sur les factures et les rapports.">
                <Input type="number" step="0.01" value={String(form["tax_rate"] ?? 0)} onChange={(e) => set("tax_rate", Number(e.target.value))} />
              </Field>
              <Field label="Frais COD (DZD)" help="Commission de la livraison contre remboursement.">
                <Input type="number" step="0.01" value={String(form["cod_fee"] ?? 0)} onChange={(e) => set("cod_fee", Number(e.target.value))} />
              </Field>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Prix TTC (taxe incluse)</div>
                  <p className="text-xs text-muted-foreground">Si activé, les prix produits incluent déjà la TVA.</p>
                </div>
                <Switch checked={Boolean(form["tax_included"])} onCheckedChange={(v) => set("tax_included", v)} />
              </div>
              <Field label="Pied de page des factures" full>
                <Textarea value={String(form["invoice_footer"] ?? "")} onChange={(e) => set("invoice_footer", e.target.value)} placeholder="Merci pour votre confiance." />
              </Field>
            </div>
            <SaveBar onSave={() => storeMutation.mutate({
              currency: form["currency"], currency_symbol: form["currency_symbol"],
              tax_rate: Number(form["tax_rate"] ?? 0), tax_included: Boolean(form["tax_included"]),
              cod_fee: Number(form["cod_fee"] ?? 0), invoice_footer: form["invoice_footer"] || null,
            })} pending={storeMutation.isPending} />
          </Card>
        </TabsContent>

        {/* ------------------------------ Opérations ------------------------------ */}
        <TabsContent value="operations">
          <Card className="p-5 border-border max-w-3xl">
            <h3 className="font-semibold text-foreground mb-4">Règles opérationnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Préfixe des commandes" help="Utilisé pour générer les codes : CMD-12345678.">
                <Input value={String(form["order_code_prefix"] ?? "CMD")} onChange={(e) => set("order_code_prefix", e.target.value.toUpperCase())} />
              </Field>
              <Field label="Frais de livraison par défaut (DZD)" help="Pré-rempli à la création d'une commande.">
                <Input type="number" step="0.01" value={String(form["default_delivery_cost"] ?? 0)} onChange={(e) => set("default_delivery_cost", Number(e.target.value))} />
              </Field>
              <Field label="Seuil d'alerte stock faible" help="Appliqué à tous les produits lors de la synchronisation.">
                <Input type="number" value={String(form["low_stock_threshold"] ?? 5)} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} />
              </Field>
            </div>
            <SaveBar onSave={() => storeMutation.mutate({
              order_code_prefix: String(form["order_code_prefix"] ?? "CMD") || "CMD",
              default_delivery_cost: Number(form["default_delivery_cost"] ?? 0),
              low_stock_threshold: Number(form["low_stock_threshold"] ?? 5),
            })} pending={storeMutation.isPending} />
          </Card>
        </TabsContent>

        {/* ----------------------------- Profils métier --------------------------- */}
        <TabsContent value="profils">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Enregistrez plusieurs identités légales et réutilisez-les sur vos factures.</p>
            <Button className="bg-primary hover:bg-ember-deep" onClick={() => { setProfileEdit(null); setProfileOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau profil
            </Button>
          </div>
          {(data?.profiles ?? []).length === 0 ? (
            <Card className="p-10 border-dashed border-border text-center">
              <Building2 className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground">Aucun profil métier</h3>
              <p className="text-sm text-muted-foreground mt-1">Ajoutez vos informations légales (RC, NIF, AI, RIB) une seule fois.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(data?.profiles ?? []).map((p) => (
                <Card key={p.id} className="p-4 border-border rounded-2xl">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground truncate">{p.name}</h4>
                        {p.is_default && <Badge className="bg-primary">Par défaut</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.legal_name || "—"}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <div><span className="text-muted-foreground">RC</span><br />{p.rc || "—"}</div>
                        <div><span className="text-muted-foreground">NIF</span><br />{p.nif || "—"}</div>
                        <div><span className="text-muted-foreground">AI</span><br />{p.ai || "—"}</div>
                      </div>
                      {p.bank_details && <p className="text-[11px] text-muted-foreground mt-2 whitespace-pre-line">{p.bank_details}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {!p.is_default && (
                        <Button size="icon" variant="ghost" title="Définir par défaut"
                          onClick={() => defProfile({ data: { id: p.id } }).then(() => { toast.success("Profil par défaut mis à jour"); invalidate(); })}>
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { setProfileEdit(p as unknown as Record<string, unknown>); setProfileOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-[#DC2626]" onClick={() => setProfileDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------ Transporteurs --------------------------- */}
        <TabsContent value="livraison">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Vos partenaires de livraison disponibles dans les commandes.</p>
            <Button className="bg-primary hover:bg-ember-deep" onClick={() => { setPartnerEdit(null); setPartnerOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data?.partners ?? []).map((p) => (
              <Card key={p.id} className="p-4 border-border flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/12 flex items-center justify-center"><Truck className="h-4 w-4 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.code}{p.store_id ? "" : " · global"}</div>
                </div>
                {p.store_id && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => { setPartnerEdit(p as unknown as Record<string, unknown>); setPartnerOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-[#DC2626]" onClick={() => setPartnerDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------------------- Synchronisation -------------------------- */}
        <TabsContent value="sync">
          <Card className="p-5 border-border max-w-3xl">
            <h3 className="font-semibold text-foreground">Synchronisation des données</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Rattache chaque commande à sa fiche client, recalcule les compteurs clients (commandes, livrées, annulées,
              total dépensé), crée les lignes de stock manquantes et applique votre seuil d'alerte à tous les produits.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <Stat label="Commandes" value={String(orders.length)} />
              <Stat label="Livrées" value={String(delivered)} />
              <Stat label="CA livré" value={fmtDZD(revenue)} />
              <Stat label="Membres" value={String((data?.members ?? []).length)} />
            </div>
            <Button className="bg-primary hover:bg-ember-deep" disabled={resyncMutation.isPending} onClick={() => resyncMutation.mutate()}>
              <RefreshCw className={`h-4 w-4 mr-1 ${resyncMutation.isPending ? "animate-spin" : ""}`} />
              {resyncMutation.isPending ? "Synchronisation…" : "Synchroniser maintenant"}
            </Button>
          </Card>

          <Card className="p-5 border-red-500/25 max-w-3xl mt-4">
            <h3 className="font-semibold text-red-400">Zone dangereuse — effacer les données</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Supprime définitivement les données choisies de votre boutique afin de repartir de zéro avec vos propres données.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { k: "orders", l: "Commandes" },
                { k: "products", l: "Produits & stock" },
                { k: "customers", l: "Clients" },
                { k: "ads", l: "Publicités" },
                { k: "finance", l: "Dépenses" },
                { k: "logistics", l: "Livraisons & retours" },
              ].map((s) => (
                <Button key={s.k} variant="outline" size="sm" disabled={purgeMutation.isPending}
                  onClick={() => setPurge([s.k])}>{s.l}</Button>
              ))}
              <Button variant="destructive" size="sm" disabled={purgeMutation.isPending} onClick={() => setPurge(["all"])}>
                Tout effacer
              </Button>
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      <EntityDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title={profileEdit ? "Modifier le profil" : "Nouveau profil métier"}
        description="Ces informations apparaissent sur vos factures."
        fields={PROFILE_FIELDS}
        values={Object.fromEntries(PROFILE_FIELDS.map((f) => [f.name, (profileEdit?.[f.name] as string) ?? ""]))}
        submitting={profileMutation.isPending}
        onSubmit={(v) => profileMutation.mutate(v)}
      />

      <EntityDialog
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        title={partnerEdit ? "Modifier le transporteur" : "Nouveau transporteur"}
        fields={PARTNER_FIELDS}
        values={Object.fromEntries(PARTNER_FIELDS.map((f) => [f.name, (partnerEdit?.[f.name] as string) ?? ""]))}
        submitting={partnerMutation.isPending}
        onSubmit={(v) => partnerMutation.mutate(v)}
      />

      <ConfirmDelete
        open={!!profileDelete}
        onOpenChange={(o) => !o && setProfileDelete(null)}
        onConfirm={() => {
          const id = profileDelete!;
          setProfileDelete(null);
          delProfile({ data: { id } }).then(() => { toast.success("Profil supprimé"); invalidate(); });
        }}
      />
      <ConfirmDelete
        open={!!partnerDelete}
        onOpenChange={(o) => !o && setPartnerDelete(null)}
        onConfirm={() => {
          const id = partnerDelete!;
          setPartnerDelete(null);
          delPart({ data: { id } }).then(() => { toast.success("Transporteur supprimé"); invalidate(); });
        }}
      />
      <ConfirmDelete
        open={!!purge}
        onOpenChange={(o) => !o && setPurge(null)}
        onConfirm={() => { if (purge) purgeMutation.mutate(purge); setPurge(null); }}
        label="Ces données seront définitivement supprimées de votre boutique. Cette action est irréversible."
      />

      </ZoricShell>
  );
}

function Field({ label, children, help, full }: { label: string; children: React.ReactNode; help?: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {help && <p className="text-[11px] text-muted-foreground mt-1">{help}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SaveBar({ onSave, pending }: { onSave: () => void; pending: boolean }) {
  return (
    <div className="mt-5 pt-4 border-t border-border flex justify-end">
      <Button className="bg-primary hover:bg-ember-deep" disabled={pending} onClick={onSave}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}
