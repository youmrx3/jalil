import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Save, Wand2 } from "lucide-react";
import { WILAYAS } from "@/lib/zoric/algeria";
import { saveShippingRates } from "@/lib/zoric/data.functions";

export type RateRow = {
  wilaya_code: string;
  wilaya_name: string;
  home_price: number;
  stopdesk_price: number;
  return_price: number;
};

export function ShippingRatesEditor({ rates }: { rates: RateRow[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveShippingRates);
  const [rows, setRows] = useState<Record<string, RateRow>>({});
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState({ home: 0, stopdesk: 0, ret: 0 });

  useEffect(() => {
    const map: Record<string, RateRow> = {};
    for (const w of WILAYAS) {
      const found = rates.find((r) => r.wilaya_code === w.code);
      map[w.code] = {
        wilaya_code: w.code,
        wilaya_name: w.name,
        home_price: Number(found?.home_price ?? 0),
        stopdesk_price: Number(found?.stopdesk_price ?? 0),
        return_price: Number(found?.return_price ?? 0),
      };
    }
    setRows(map);
  }, [rates]);

  const list = useMemo(
    () => WILAYAS.filter((w) => `${w.code} ${w.name}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  const mut = useMutation({
    mutationFn: () => save({ data: { rows: Object.values(rows) } }),
    onSuccess: () => { toast.success("Tarifs de livraison enregistrés"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (code: string, key: keyof RateRow, v: number) =>
    setRows((r) => ({ ...r, [code]: { ...r[code]!, [key]: v } }));

  const applyBulk = () =>
    setRows((r) => {
      const next: Record<string, RateRow> = {};
      for (const [k, v] of Object.entries(r)) {
        next[k] = { ...v, home_price: bulk.home, stopdesk_price: bulk.stopdesk, return_price: bulk.ret };
      }
      return next;
    });

  return (
    <Card className="p-5 border-border rounded-2xl">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Tarifs par wilaya</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Définissez le tarif à domicile, en stopdesk et le coût d'un retour. Ils sont appliqués automatiquement à la création d'une commande.
          </p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 rounded-full" placeholder="Rechercher une wilaya…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4 p-3 rounded-xl bg-muted border border-border">
        <div className="text-xs text-muted-foreground w-full sm:w-auto sm:mr-2">Appliquer à toutes les wilayas :</div>
        <LabeledMini label="Domicile" value={bulk.home} onChange={(v) => setBulk({ ...bulk, home: v })} />
        <LabeledMini label="Stopdesk" value={bulk.stopdesk} onChange={(v) => setBulk({ ...bulk, stopdesk: v })} />
        <LabeledMini label="Retour" value={bulk.ret} onChange={(v) => setBulk({ ...bulk, ret: v })} />
        <Button type="button" variant="outline" className="rounded-full" onClick={applyBulk}>
          <Wand2 className="h-4 w-4 mr-1" /> Appliquer
        </Button>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Wilaya</th>
              <th className="px-3 py-2 font-medium w-32">À domicile</th>
              <th className="px-3 py-2 font-medium w-32">Stopdesk</th>
              <th className="px-3 py-2 font-medium w-32">Retour</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w) => {
              const r = rows[w.code];
              if (!r) return null;
              return (
                <tr key={w.code} className="border-t border-border">
                  <td className="px-3 py-1.5 text-foreground whitespace-nowrap">
                    <span className="text-muted-foreground mr-1">{w.code}</span>{w.name}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input type="number" step="0.01" className="h-8" value={r.home_price}
                      onChange={(e) => set(w.code, "home_price", Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input type="number" step="0.01" className="h-8" value={r.stopdesk_price}
                      onChange={(e) => set(w.code, "stopdesk_price", Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input type="number" step="0.01" className="h-8" value={r.return_price}
                      onChange={(e) => set(w.code, "return_price", Number(e.target.value))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button className="bg-primary hover:bg-ember-deep rounded-full" disabled={mut.isPending} onClick={() => mut.mutate()}>
          <Save className="h-4 w-4 mr-1" /> {mut.isPending ? "Enregistrement…" : "Enregistrer les tarifs"}
        </Button>
      </div>
    </Card>
  );
}

function LabeledMini({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <Input type="number" step="0.01" className="h-8 w-28" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
