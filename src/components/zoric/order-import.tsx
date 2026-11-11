import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchRemoteSheet, importOrders } from "@/lib/zoric/data.functions";

type Row = Record<string, string>;

const FIELDS: { key: string; label: string; hints: string[]; required?: boolean }[] = [
  { key: "customer_name", label: "Nom du client", hints: ["nom", "client", "name", "customer", "fullname", "nomcomplet", "الاسم"], required: true },
  { key: "customer_phone", label: "Téléphone", hints: ["tel", "telephone", "phone", "mobile", "numero", "gsm", "الهاتف"], required: true },
  { key: "product_name", label: "Produit", hints: ["produit", "product", "article", "item", "sku", "المنتج"] },
  { key: "quantity", label: "Quantité", hints: ["quantite", "qty", "quantity", "qte", "nombre", "الكمية"] },
  { key: "unit_price", label: "Prix (unitaire)", hints: ["prix", "price", "montant", "total", "pu", "prixunitaire", "السعر"] },
  { key: "delivery_type", label: "Type de livraison", hints: ["livraison", "delivery", "type", "stopdesk", "domicile", "mode"] },
  { key: "delivery_cost", label: "Frais de livraison", hints: ["fraislivraison", "deliverycost", "shipping", "fraisdelivraison", "frais"] },
  { key: "wilaya", label: "Wilaya", hints: ["wilaya", "etat", "state", "province", "الولاية"] },
  { key: "city", label: "Commune", hints: ["commune", "ville", "city", "daira", "البلدية"] },
  { key: "address", label: "Adresse", hints: ["adresse", "address", "العنوان"] },
  { key: "order_code", label: "Code commande", hints: ["code", "commande", "order", "reference", "ref", "id"] },
  { key: "status", label: "Statut", hints: ["statut", "status", "etat"] },
  { key: "order_date", label: "Date", hints: ["date", "datecommande", "createdat", "التاريخ"] },
  { key: "source", label: "Source", hints: ["source", "canal", "origine"] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff]/g, "");

function autoMap(headers: string[]) {
  const map: Record<string, string> = {};
  for (const f of FIELDS) {
    const found = headers.find((h) => {
      const n = norm(h);
      return f.hints.some((hint) => n === hint) || f.hints.some((hint) => n.includes(hint));
    });
    if (found && !Object.values(map).includes(found)) map[f.key] = found;
  }
  return map;
}

function parseNumber(v: string) {
  const cleaned = String(v ?? "").replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function parseDeliveryType(v: string) {
  const n = norm(v ?? "");
  if (!n) return "home";
  if (n.includes("stop") || n.includes("desk") || n.includes("bureau") || n.includes("agence") || n.includes("مكتب")) return "stopdesk";
  return "home";
}

function parseDate(v: string) {
  const raw = String(v ?? "").trim();
  if (!raw) return undefined;
  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

const STATUS_MAP: Record<string, string> = {
  new: "new", nouveau: "new", nouvelle: "new", pending: "new", enattente: "new",
  confirmed: "confirmed", confirme: "confirmed", confirmee: "confirmed",
  shipped: "shipped", expedie: "shipped", expediee: "shipped", enlivraison: "shipped",
  delivered: "delivered", livre: "delivered", livree: "delivered",
  returned: "returned", retour: "returned", retourne: "returned",
  cancelled: "cancelled", annule: "cancelled", annulee: "cancelled",
};

export function OrderImportDialog({
  open, onOpenChange, productNames, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productNames: string[];
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sheetUrl, setSheetUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");

  const fetchSheet = useServerFn(fetchRemoteSheet);
  const runImport = useServerFn(importOrders);

  const loadWorkbook = (data: ArrayBuffer | string, label: string) => {
    const wb = typeof data === "string"
      ? XLSX.read(data, { type: "string" })
      : XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
    if (json.length === 0) { toast.error("Feuille vide"); return; }
    const hdrs = Object.keys(json[0]).filter((h) => h.trim() !== "");
    setHeaders(hdrs);
    setRows(json);
    setMapping(autoMap(hdrs));
    setSourceLabel(label);
    toast.success(`${json.length} lignes détectées`);
  };

  const onFile = async (f: File) => {
    try {
      loadWorkbook(await f.arrayBuffer(), f.name);
    } catch (e) {
      toast.error(`Lecture impossible : ${(e as Error).message}`);
    }
  };

  const sheetMut = useMutation({
    mutationFn: () => fetchSheet({ data: { url: sheetUrl } }),
    onSuccess: (r) => loadWorkbook(r.csv, "Google Sheet"),
    onError: (e: Error) => toast.error(e.message),
  });

  const productSet = useMemo(
    () => new Set(productNames.map((p) => norm(p))),
    [productNames],
  );

  const prepared = useMemo(() => {
    const get = (r: Row, key: string) => (mapping[key] ? String(r[mapping[key]] ?? "").trim() : "");
    return rows.map((r) => {
      const statusRaw = norm(get(r, "status"));
      const productName = get(r, "product_name");
      return {
        order_code: get(r, "order_code") || undefined,
        customer_name: get(r, "customer_name"),
        customer_phone: get(r, "customer_phone"),
        wilaya: get(r, "wilaya") || undefined,
        city: get(r, "city") || undefined,
        address: get(r, "address") || undefined,
        product_name: productName || undefined,
        quantity: parseNumber(get(r, "quantity")) ?? 1,
        unit_price: parseNumber(get(r, "unit_price")),
        delivery_type: parseDeliveryType(get(r, "delivery_type")),
        delivery_cost: mapping["delivery_cost"] ? parseNumber(get(r, "delivery_cost")) ?? null : null,
        status: STATUS_MAP[statusRaw] ?? "new",
        order_date: parseDate(get(r, "order_date")),
        source: get(r, "source") || "import",
        _matched: productName ? productSet.has(norm(productName)) : false,
      };
    }).filter((r) => r.customer_name || r.customer_phone);
  }, [rows, mapping, productSet]);

  const matchedCount = prepared.filter((r) => r._matched).length;
  const unmatched = prepared.filter((r) => r.product_name && !r._matched);

  const importMut = useMutation({
    mutationFn: () => runImport({ data: { rows: prepared.map(({ _matched, ...rest }) => rest) } }),
    onSuccess: (r) => {
      toast.success(`${r.imported} commandes importées · ${r.matchedProducts} produits liés au stock${r.skipped ? ` · ${r.skipped} ignorées` : ""}`);
      if (r.errors.length) toast.error(r.errors[0]);
      reset();
      onOpenChange(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setHeaders([]); setRows([]); setMapping({}); setSheetUrl(""); setSourceLabel("");
  };

  const missingRequired = FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Importer un CRM (Excel / Google Sheet)</DialogTitle>
          <DialogDescription>
            Les colonnes sont détectées automatiquement. Les produits portant le même nom que dans vos fiches produits
            sont liés au stock, à la livraison et aux statistiques.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-border bg-muted p-8 text-center transition hover:border-primary hover:bg-muted"
            >
              <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-foreground">Choisir un fichier .xlsx / .xls / .csv</p>
              <p className="text-xs text-muted-foreground">Exporté depuis votre CRM ou Google Sheets</p>
            </button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-muted" /> ou <div className="h-px flex-1 bg-muted" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm"><Link2 className="h-4 w-4" /> Lien Google Sheet (partagé en lecture)</Label>
              <div className="flex gap-2">
                <Input
                  className="rounded-full"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <Button
                  className="rounded-full bg-primary"
                  disabled={!sheetUrl || sheetMut.isPending}
                  onClick={() => sheetMut.mutate()}
                >
                  {sheetMut.isPending ? "Lecture…" : "Charger"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="rounded-full">{sourceLabel}</Badge>
              <Badge variant="outline" className="rounded-full">{prepared.length} commandes</Badge>
              <Badge variant="outline" className="rounded-full text-emerald-400 border-emerald-500/25">
                {matchedCount} produits reconnus
              </Badge>
              <Button variant="ghost" size="sm" className="ml-auto rounded-full" onClick={reset}>Changer de fichier</Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Correspondance des colonnes</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {f.label}{f.required && <span className="text-rose-500"> *</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? "__none"}
                      onValueChange={(v) => setMapping((m) => {
                        const next = { ...m };
                        if (v === "__none") delete next[f.key]; else next[f.key] = v;
                        return next;
                      })}
                    >
                      <SelectTrigger className="h-9 rounded-full bg-card"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Ignorer —</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {unmatched.length > 0 && (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-500/12 p-3 text-xs text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {unmatched.length} ligne(s) ont un produit introuvable dans vos fiches produits
                  ({[...new Set(unmatched.map((u) => u.product_name))].slice(0, 4).join(", ")}…).
                  Elles seront importées, mais sans déduction de stock. Utilisez exactement le même nom dans le CRM et dans Produits.
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Aperçu (5 premières lignes)</p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead>Livraison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prepared.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.customer_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.customer_phone || "—"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {r._matched && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                            {r.product_name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell className="text-right">{r.unit_price ?? "auto"}</TableCell>
                        <TableCell>{r.delivery_type === "stopdesk" ? "Stopdesk" : "À domicile"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
          <Button
            className="rounded-full bg-primary"
            disabled={prepared.length === 0 || missingRequired.length > 0 || importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {importMut.isPending ? "Import en cours…" : `Importer ${prepared.length || ""} commandes`}
          </Button>
        </DialogFooter>
        {missingRequired.length > 0 && rows.length > 0 && (
          <p className="text-right text-xs text-rose-500">Colonnes requises manquantes : {missingRequired.join(", ")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
