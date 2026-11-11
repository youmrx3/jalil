import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Download, FileText, Sparkles, BookmarkPlus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApp, type Invoice, type InvoiceService, type PaymentStatus } from "@/lib/store";
import { invoiceServiceTotal, invoiceTotalDZD } from "@/lib/calc";
import { fmtDZD, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Nexus Business" },
      { name: "description", content: "Build agency invoices with saved reusable services." },
    ],
  }),
  component: InvoicesPage,
});

const PAY_STATUSES: PaymentStatus[] = ["Not Paid", "Partially Paid", "Paid", "Cancelled"];
const uid = () => Math.random().toString(36).slice(2, 10);

function newDraft(fxRate: number): Omit<Invoice, "id"> {
  return {
    number: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    clientName: "",
    company: "",
    project: "",
    adBudgetUSD: 0,
    fxRate,
    services: [],
    paymentStatus: "Not Paid",
    notes: "",
  };
}

function InvoicesPage() {
  const invoices = useApp((s) => s.invoices);
  const settings = useApp((s) => s.settings);
  const savedServices = useApp((s) => s.savedServices);
  const addSavedService = useApp((s) => s.addSavedService);
  const deleteSavedService = useApp((s) => s.deleteSavedService);
  const addInvoice = useApp((s) => s.addInvoice);
  const deleteInvoice = useApp((s) => s.deleteInvoice);
  const [draft, setDraft] = useState<Omit<Invoice, "id">>(newDraft(settings.fxRate));

  const servicesTotal = useMemo(() => invoiceServiceTotal({ ...draft, id: "" }), [draft]);
  const budgetDZD = draft.adBudgetUSD * draft.fxRate;
  const subtotal = servicesTotal + budgetDZD;
  const finalTotal = invoiceTotalDZD({ ...draft, id: "" }, settings.taxPercent);

  const toggleService = (id: string, patch: Partial<InvoiceService>) => {
    setDraft({ ...draft, services: draft.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const addCustom = () => {
    setDraft({ ...draft, services: [...draft.services, { id: uid(), name: "Custom Service", price: 0, checked: true }] });
  };
  const removeService = (id: string) => setDraft({ ...draft, services: draft.services.filter((s) => s.id !== id) });

  const addFromSaved = (svcId: string) => {
    const svc = savedServices.find((x) => x.id === svcId);
    if (!svc) return;
    if (draft.services.some((s) => s.name === svc.name)) return toast.info("Already added");
    setDraft({
      ...draft,
      services: [...draft.services, { id: uid(), name: svc.name, price: svc.price, note: svc.note, checked: true }],
    });
  };

  const saveAsReusable = (s: InvoiceService) => {
    if (!s.name.trim()) return toast.error("Name required");
    if (savedServices.some((x) => x.name === s.name)) return toast.info("Already saved");
    addSavedService({ name: s.name, price: s.price, note: s.note, category: "custom" });
    toast.success(`"${s.name}" saved — reusable in future invoices`);
  };

  const save = () => {
    if (!draft.clientName) return toast.error("Client name required");
    addInvoice(draft);
    toast.success("Invoice saved");
    setDraft(newDraft(settings.fxRate));
  };

  const exportPDF = (inv: Omit<Invoice, "id"> & { id?: string }) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 34, "F");
    if (settings.logoDataUrl) {
      try { doc.addImage(settings.logoDataUrl, "PNG", 14, 7, 20, 20); } catch { /* noop */ }
    }
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.text(settings.companyName, 40, 16);
    doc.setFontSize(9);
    if (settings.companyAddress) doc.text(settings.companyAddress, 40, 22);
    const contactBits = [settings.companyPhone, settings.companyEmail].filter(Boolean).join(" · ");
    if (contactBits) doc.text(contactBits, 40, 27);
    doc.setFontSize(22);
    doc.text("INVOICE", pageW - 14, 20, { align: "right" });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`# ${inv.number}`, pageW - 14, 42, { align: "right" });
    doc.text(`Date: ${fmtDate(inv.date)}`, pageW - 14, 48, { align: "right" });
    doc.text(`Status: ${inv.paymentStatus}`, pageW - 14, 54, { align: "right" });

    let legalY = 42;
    doc.setFontSize(9); doc.setTextColor(90);
    if (settings.companyRC) { doc.text(`RC: ${settings.companyRC}`, 14, legalY); legalY += 5; }
    if (settings.companyNIF) { doc.text(`NIF: ${settings.companyNIF}`, 14, legalY); legalY += 5; }
    if (settings.companyAI) { doc.text(`AI: ${settings.companyAI}`, 14, legalY); legalY += 5; }

    const y0 = Math.max(legalY, 60) + 4;
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 14, y0);
    doc.setFont("helvetica", "normal");
    doc.text(inv.clientName, 14, y0 + 6);
    if (inv.company) doc.text(inv.company, 14, y0 + 12);
    if (inv.project) doc.text(`Project: ${inv.project}`, 14, y0 + 18);

    const rows = inv.services.filter((s) => s.checked).map((s) => [s.name, s.note ?? "", fmtDZD(s.price)]);
    if (inv.adBudgetUSD > 0) {
      rows.push([`Advertising Budget (${inv.adBudgetUSD} USD × ${inv.fxRate})`, "", fmtDZD(inv.adBudgetUSD * inv.fxRate)]);
    }
    autoTable(doc, {
      startY: y0 + 30,
      head: [["Service", "Notes", "Amount (DZD)"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 8;
    const svcTot = invoiceServiceTotal({ ...inv, id: "" } as Invoice) + inv.adBudgetUSD * inv.fxRate;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${fmtDZD(svcTot)}`, pageW - 14, y, { align: "right" }); y += 6;
    if (settings.taxPercent > 0) { doc.text(`Tax (${settings.taxPercent}%): ${fmtDZD(svcTot * settings.taxPercent / 100)}`, pageW - 14, y, { align: "right" }); y += 6; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 58, 138);
    doc.text(`TOTAL: ${fmtDZD(invoiceTotalDZD({ ...inv, id: "" } as Invoice, settings.taxPercent))}`, pageW - 14, y + 2, { align: "right" }); y += 12;
    doc.setTextColor(0); doc.setFont("helvetica", "normal");

    if (settings.companyBank) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("Payment Details:", 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const lines = doc.splitTextToSize(settings.companyBank, pageW - 28);
      doc.text(lines, 14, y + 6);
    }
    if (settings.invoiceFooter) {
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(settings.invoiceFooter, 14, 285);
    }
    doc.save(`${inv.number}.pdf`);
  };

  return (
    <AppLayout title="Invoice Builder">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
            <CardHeader><CardTitle className="text-sm">Client & Project</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={draft.date.slice(0,10)} onChange={(e) => setDraft({ ...draft, date: new Date(e.target.value).toISOString() })} /></div>
              <div><Label>Client Name</Label><Input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} /></div>
              <div className="col-span-2"><Label>Project</Label><Input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} /></div>
              <div><Label>Ad Budget (USD)</Label><Input type="number" step="0.01" value={draft.adBudgetUSD} onChange={(e) => setDraft({ ...draft, adBudgetUSD: +e.target.value })} /></div>
              <div><Label>FX Rate</Label><Input type="number" step="0.01" value={draft.fxRate} onChange={(e) => setDraft({ ...draft, fxRate: +e.target.value })} /></div>
              <div><Label>Payment Status</Label>
                <Select value={draft.paymentStatus} onValueChange={(v) => setDraft({ ...draft, paymentStatus: v as PaymentStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card className="border-border/60" style={{ background: "var(--gradient-card)" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Saved Services (one-click add)</CardTitle>
              <p className="text-[11px] text-muted-foreground">Click to add. Manage the library — anything you save here is reusable forever.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {savedServices.length === 0 && <p className="text-xs text-muted-foreground">No saved services yet.</p>}
                {savedServices.map((s) => (
                  <div key={s.id} className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-background pl-3 pr-1 py-0.5 text-xs">
                    <button className="hover:text-[color:var(--electric)]" onClick={() => addFromSaved(s.id)}>
                      + {s.name}{s.price > 0 ? ` · ${fmtDZD(s.price)}` : ""}
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 grid place-items-center rounded-full hover:bg-destructive/10"
                      title="Remove from library"
                      onClick={() => { deleteSavedService(s.id); toast.success("Removed from library"); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Services on this Invoice</CardTitle>
              <Button size="sm" variant="outline" onClick={addCustom}><Plus className="h-3.5 w-3.5 mr-1" /> Custom</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right w-32">Price (DZD)</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.services.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                      Pick services from the library above or click "+ Custom".
                    </TableCell></TableRow>
                  )}
                  {draft.services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Checkbox checked={s.checked} onCheckedChange={(v) => toggleService(s.id, { checked: !!v })} /></TableCell>
                      <TableCell><Input value={s.name} onChange={(e) => toggleService(s.id, { name: e.target.value })} className="h-8" /></TableCell>
                      <TableCell><Input value={s.note ?? ""} onChange={(e) => toggleService(s.id, { note: e.target.value })} className="h-8" placeholder="Optional" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={s.price} onChange={(e) => toggleService(s.id, { price: +e.target.value })} className="h-8 text-right" /></TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" onClick={() => saveAsReusable(s)} title="Save to library"><BookmarkPlus className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => removeService(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/60" style={{ background: "var(--gradient-kpi)" }}>
            <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Services total" value={fmtDZD(servicesTotal)} />
              <Row label={`Ad Budget (${draft.adBudgetUSD} × ${draft.fxRate})`} value={fmtDZD(budgetDZD)} />
              <Row label="Subtotal" value={fmtDZD(subtotal)} />
              {settings.taxPercent > 0 && <Row label={`Tax (${settings.taxPercent}%)`} value={fmtDZD(subtotal * settings.taxPercent / 100)} />}
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="gradient-text">{fmtDZD(finalTotal)}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={save}>Save</Button>
                <Button variant="outline" className="flex-1" onClick={() => exportPDF(draft)}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4 border-border/60">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Saved Invoices</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead>
                <TableHead>Project</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No invoices yet.</TableCell></TableRow>)}
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                  <TableCell>{fmtDate(inv.date)}</TableCell>
                  <TableCell>{inv.clientName}</TableCell>
                  <TableCell>{inv.project}</TableCell>
                  <TableCell className="text-right">{fmtDZD(invoiceTotalDZD(inv, settings.taxPercent))}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{inv.paymentStatus}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => exportPDF(inv)}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) { deleteInvoice(inv.id); toast.success("Deleted"); } }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
