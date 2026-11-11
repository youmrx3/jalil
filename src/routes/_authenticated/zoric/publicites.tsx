import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { ZoricShell, StatusPill } from "@/components/zoric/shell";
import { EntityDialog, Toolbar, EmptyState, ConfirmDelete, type FormValues } from "@/components/zoric/crud";
import { listAds, saveCampaign, deleteCampaign, saveAdMetric, deleteAdMetric } from "@/lib/zoric/data.functions";
import { useSelection, SelectAllHead, SelectCell, BulkBar } from "@/components/zoric/bulk";
import { fmtDZD, fmtDate } from "@/lib/zoric/format";

export const Route = createFileRoute("/_authenticated/zoric/publicites")({
  head: () => ({
    meta: [
      { title: "Publicités — Zoric Commerce OS" },
      { name: "description", content: "Campagnes publicitaires, dépenses, CPA et ROAS." },
      { property: "og:title", content: "Publicités — Zoric Commerce OS" },
      { property: "og:description", content: "Pilotez vos campagnes et votre rentabilité publicitaire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const EMPTY_CAMP: FormValues = { name: "", platform_id: "", objective: "", status: "active", daily_budget: 0, start_date: "", end_date: "" };
const EMPTY_METRIC: FormValues = { campaign_id: "", metric_date: new Date().toISOString().slice(0, 10), spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, confirmed_orders: 0, attributed_revenue: 0 };

function Page() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAds);
  const saveC = useServerFn(saveCampaign);
  const delC = useServerFn(deleteCampaign);
  const saveM = useServerFn(saveAdMetric);
  const delM = useServerFn(deleteAdMetric);

  const { data, isLoading } = useQuery({ queryKey: ["zoric-ads"], queryFn: () => fetchAll() });
  const [search, setSearch] = useState("");
  const [camp, setCamp] = useState<{ open: boolean; id?: string; values: FormValues }>({ open: false, values: EMPTY_CAMP });
  const [metric, setMetric] = useState<{ open: boolean; id?: string; values: FormValues }>({ open: false, values: EMPTY_METRIC });
  const [toDelete, setToDelete] = useState<{ kind: "camp" | "metric"; id: string } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["zoric-ads"] });
    qc.invalidateQueries({ queryKey: ["zoric-overview"] });
  };
  const clean = (v: FormValues, nums: string[]) => {
    const o: Record<string, unknown> = {};
    Object.entries(v).forEach(([k, val]) => { o[k] = val === "" ? null : val; });
    nums.forEach((k) => { o[k] = Number(o[k] ?? 0); });
    return o;
  };

  const campMut = useMutation({
    mutationFn: (v: { id?: string; values: FormValues }) => saveC({ data: { id: v.id, values: clean(v.values, ["daily_budget"]) } }),
    onSuccess: () => { invalidate(); setCamp({ open: false, values: EMPTY_CAMP }); toast.success("Campagne enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const metricMut = useMutation({
    mutationFn: (v: { id?: string; values: FormValues }) => saveM({ data: { id: v.id, values: clean(v.values, ["spend", "impressions", "clicks", "leads", "purchases", "confirmed_orders", "attributed_revenue"]) } }),
    onSuccess: () => { invalidate(); setMetric({ open: false, values: EMPTY_METRIC }); toast.success("Performance enregistrée"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (v: { kind: "camp" | "metric"; id: string }) => v.kind === "camp" ? delC({ data: { id: v.id } }) : delM({ data: { id: v.id } }),
    onSuccess: () => { invalidate(); toast.success("Supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const platformOptions = (data?.platforms ?? []).map((p) => ({ value: p.id, label: p.name }));
  const campaignOptions = (data?.campaigns ?? []).map((c) => ({ value: c.id, label: c.name }));

  const rows = useMemo(() => {
    const agg: Record<string, { spend: number; purchases: number; revenue: number }> = {};
    (data?.metrics ?? []).forEach((m) => {
      const a = agg[m.campaign_id] ?? { spend: 0, purchases: 0, revenue: 0 };
      a.spend += Number(m.spend); a.purchases += Number(m.purchases); a.revenue += Number(m.attributed_revenue);
      agg[m.campaign_id] = a;
    });
    return (data?.campaigns ?? [])
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .map((c) => ({ ...c, ...(agg[c.id] ?? { spend: 0, purchases: 0, revenue: 0 }) }));
  }, [data, search]);

  const selection = useSelection(rows.map((r) => r.id));

  return (
    <ZoricShell title="Publicités" subtitle="Suivez vos dépenses, votre CPA et votre ROAS campagne par campagne.">
      <Toolbar search={search} onSearch={setSearch} onAdd={() => setCamp({ open: true, values: EMPTY_CAMP })} addLabel="Nouvelle campagne" placeholder="Rechercher une campagne…">
        <Button variant="outline" onClick={() => setMetric({ open: true, values: EMPTY_METRIC })}>
          <Plus className="h-4 w-4 mr-1" /> Performance
        </Button>
      </Toolbar>

      {isLoading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <EmptyState title="Aucune campagne" hint="Créez une campagne puis saisissez ses performances quotidiennes (dépense, achats, revenus)." />
      ) : (
        <Card className="border-border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead selection={selection} />
                  <TableHead>Campagne</TableHead>
                  <TableHead className="hidden sm:table-cell">Statut</TableHead>
                  <TableHead className="text-right">Dépense</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Achats</TableHead>
                  <TableHead className="text-right hidden md:table-cell">CPA</TableHead>
                  <TableHead className="text-right">Revenus</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <SelectCell selection={selection} id={c.id} />
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusPill status={c.status === "active" ? "success" : "neutral"} label={c.status === "active" ? "Active" : "En pause"} />
                    </TableCell>
                    <TableCell className="text-right">{fmtDZD(c.spend)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{c.purchases}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{fmtDZD(c.purchases > 0 ? c.spend / c.purchases : 0)}</TableCell>
                    <TableCell className="text-right">{fmtDZD(c.revenue)}</TableCell>
                    <TableCell className={`text-right font-semibold ${c.spend > 0 && c.revenue / c.spend >= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                      {(c.spend > 0 ? c.revenue / c.spend : 0).toFixed(2)}x
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setCamp({
                        open: true, id: c.id,
                        values: { name: c.name, platform_id: c.platform_id, objective: c.objective ?? "", status: c.status, daily_budget: Number(c.daily_budget ?? 0), start_date: c.start_date ?? "", end_date: c.end_date ?? "" },
                      })}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete({ kind: "camp", id: c.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Card className="p-5 border-border rounded-2xl">
        <h3 className="font-semibold text-foreground mb-3">Performances saisies</h3>
        {(data?.metrics ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée de performance.</p>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Dépense</TableHead>
                  <TableHead className="text-right">Achats</TableHead>
                  <TableHead className="text-right">Revenus</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.metrics ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{fmtDate(m.metric_date)}</TableCell>
                    <TableCell className="text-sm">{data?.campaigns.find((c) => c.id === m.campaign_id)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{fmtDZD(Number(m.spend))}</TableCell>
                    <TableCell className="text-right">{m.purchases}</TableCell>
                    <TableCell className="text-right">{fmtDZD(Number(m.attributed_revenue))}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setMetric({
                        open: true, id: m.id,
                        values: {
                          campaign_id: m.campaign_id, metric_date: m.metric_date, spend: Number(m.spend),
                          impressions: m.impressions, clicks: m.clicks, leads: m.leads, purchases: m.purchases,
                          confirmed_orders: m.confirmed_orders, attributed_revenue: Number(m.attributed_revenue),
                        },
                      })}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete({ kind: "metric", id: m.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <EntityDialog
        open={camp.open}
        onOpenChange={(o) => setCamp((c) => ({ ...c, open: o }))}
        title={camp.id ? "Modifier la campagne" : "Nouvelle campagne"}
        fields={[
          { name: "name", label: "Nom de la campagne", required: true, half: false },
          { name: "platform_id", label: "Plateforme", type: "select", options: platformOptions },
          { name: "objective", label: "Objectif", placeholder: "Conversions, trafic…" },
          { name: "status", label: "Statut", type: "select", options: [{ value: "active", label: "Active" }, { value: "paused", label: "En pause" }] },
          { name: "daily_budget", label: "Budget quotidien (DZD)", type: "number" },
          { name: "start_date", label: "Début", type: "date" },
          { name: "end_date", label: "Fin", type: "date" },
        ]}
        values={camp.values}
        submitting={campMut.isPending}
        onSubmit={(v) => campMut.mutate({ id: camp.id, values: v })}
      />

      <EntityDialog
        open={metric.open}
        onOpenChange={(o) => setMetric((m) => ({ ...m, open: o }))}
        title={metric.id ? "Modifier la performance" : "Saisir une performance"}
        fields={[
          { name: "campaign_id", label: "Campagne", type: "select", options: campaignOptions, half: false },
          { name: "metric_date", label: "Date", type: "date" },
          { name: "spend", label: "Dépense (DZD)", type: "number" },
          { name: "impressions", label: "Impressions", type: "number", step: "1" },
          { name: "clicks", label: "Clics", type: "number", step: "1" },
          { name: "leads", label: "Leads", type: "number", step: "1" },
          { name: "purchases", label: "Achats", type: "number", step: "1" },
          { name: "confirmed_orders", label: "Commandes confirmées", type: "number", step: "1" },
          { name: "attributed_revenue", label: "Revenus attribués (DZD)", type: "number" },
        ]}
        values={metric.values}
        submitting={metricMut.isPending}
        onSubmit={(v) => metricMut.mutate({ id: metric.id, values: v })}
      />

      <ConfirmDelete open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => { if (toDelete) delMut.mutate(toDelete); setToDelete(null); }} />
      <BulkBar
        selection={selection}
        entity="campaigns"
        rows={rows as unknown as Record<string, unknown>[]}
        queryKeys={["zoric-ads"]}
        markOptions={[{ field: "status", value: "active", label: "Active" }, { field: "status", value: "paused", label: "En pause" }, { field: "status", value: "ended", label: "Terminée" }]}
        allowDuplicate={true}
        exportName="campagnes"
      />

    </ZoricShell>
  );
}
