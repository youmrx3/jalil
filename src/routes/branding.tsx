import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Download, Palette, Package as PackageIcon, FileText, Sparkles } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppLayout } from "@/components/app-layout";
import { KPICard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApp, type BrandPackage, type BrandProject, type BrandStatus, type BrandDeliverable } from "@/lib/store";
import { fmtDZD, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/branding")({
  head: () => ({
    meta: [
      { title: "Branding — Nexus Business" },
      { name: "description", content: "Brand identity packages, projects and full invoice generation." },
    ],
  }),
  component: BrandingPage,
});

const STATUSES: BrandStatus[] = ["Draft", "In Progress", "Delivered", "Paid", "Cancelled"];
const statusVariant: Record<BrandStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Draft: "outline",
  "In Progress": "secondary",
  Delivered: "secondary",
  Paid: "default",
  Cancelled: "destructive",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const sum = (d: BrandDeliverable[]) => d.reduce((s, x) => s + (x.price || 0), 0);

const emptyPackage = (): Omit<BrandPackage, "id"> => ({
  name: "",
  description: "",
  price: 0,
  priceUSD: 0,
  deliverables: [{ name: "", price: 0 }],
});

const emptyProject = (fx: number): Omit<BrandProject, "id"> => ({
  number: `BRD-${Date.now().toString().slice(-6)}`,
  date: new Date().toISOString(),
  clientName: "",
  company: "",
  phone: "",
  email: "",
  packageName: "",
  deliverables: [],
  priceDZD: 0,
  priceUSD: 0,
  fxRate: fx,
  depositDZD: 0,
  status: "Draft",
  notes: "",
});

function BrandingPage() {
  const packages = useApp((s) => s.savedPackages);
  const projects = useApp((s) => s.brandProjects);
  const settings = useApp((s) => s.settings);
  const addPackage = useApp((s) => s.addSavedPackage);
  const updatePackage = useApp((s) => s.updateSavedPackage);
  const deletePackage = useApp((s) => s.deleteSavedPackage);
  const addProject = useApp((s) => s.addBrandProject);
  const updateProject = useApp((s) => s.updateBrandProject);
  const deleteProject = useApp((s) => s.deleteBrandProject);

  const totals = useMemo(() => {
    let revenue = 0, received = 0, pending = 0;
    for (const p of projects) {
      revenue += p.priceDZD;
      received += p.depositDZD;
      if (p.status !== "Cancelled") pending += Math.max(0, p.priceDZD - p.depositDZD);
    }
    return { revenue, received, pending };
  }, [projects]);

  return (
    <AppLayout title="Branding & Identity">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="h-5 w-5 text-[color:var(--electric)]" />
        <h2 className="text-xl font-bold tracking-tight">Brand Identity Services</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Total Projects" value={projects.length} icon={Palette} tone="primary" />
        <KPICard label="Revenue" value={fmtDZD(totals.revenue)} icon={Sparkles} tone="accent" />
        <KPICard label="Received" value={fmtDZD(totals.received)} icon={FileText} tone="success" />
        <KPICard label="Pending" value={fmtDZD(totals.pending)} icon={FileText} tone="warning" />
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="packages">Saved Packages ({packages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <ProjectsTab
            projects={projects}
            packages={packages}
            fx={settings.fxRate}
            addProject={addProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
          />
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          <PackagesTab
            packages={packages}
            addPackage={addPackage}
            updatePackage={updatePackage}
            deletePackage={deletePackage}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* -------------------------------- PACKAGES -------------------------------- */

function PackagesTab({
  packages, addPackage, updatePackage, deletePackage,
}: {
  packages: BrandPackage[];
  addPackage: (p: Omit<BrandPackage, "id">) => void;
  updatePackage: (id: string, p: Partial<BrandPackage>) => void;
  deletePackage: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BrandPackage | null>(null);
  const [form, setForm] = useState<Omit<BrandPackage, "id">>(emptyPackage());

  const openNew = () => { setEditing(null); setForm(emptyPackage()); setOpen(true); };
  const openEdit = (p: BrandPackage) => { setEditing(p); setForm({ ...p }); setOpen(true); };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Package name required");
    const cleanDeliverables = form.deliverables.filter((d) => d.name.trim());
    const finalPrice = form.price || sum(cleanDeliverables);
    const payload = { ...form, deliverables: cleanDeliverables, price: finalPrice };
    if (editing) updatePackage(editing.id, payload);
    else addPackage(payload);
    toast.success("Package saved — reusable in every new project");
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Save a branding package once, reuse it every time you create a project — no re-typing.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Package</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Package" : "New Package"}</DialogTitle></DialogHeader>
            <PackageForm form={form} setForm={setForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Save Package</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {packages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No saved packages yet. Create one — you'll be able to pick it in one click on new projects.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {packages.map((p) => (
            <Card key={p.id} className="border-border/60" style={{ background: "var(--gradient-card)" }}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <PackageIcon className="h-4 w-4 text-[color:var(--royal)] dark:text-[color:var(--electric)]" />
                      <span className="truncate">{p.name}</span>
                    </CardTitle>
                    {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete package?")) { deletePackage(p.id); toast.success("Deleted"); } }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 mb-3">
                  {p.deliverables.slice(0, 5).map((d, i) => (
                    <li key={i} className="flex justify-between border-b border-border/40 pb-1">
                      <span className="truncate">• {d.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{fmtDZD(d.price)}</span>
                    </li>
                  ))}
                  {p.deliverables.length > 5 && (
                    <li className="text-muted-foreground text-[10px]">+ {p.deliverables.length - 5} more</li>
                  )}
                </ul>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold gradient-text">{fmtDZD(p.price)}</span>
                </div>
                {p.priceUSD ? <p className="text-[10px] text-muted-foreground text-right">≈ ${p.priceUSD} USD</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function PackageForm({
  form, setForm,
}: { form: Omit<BrandPackage, "id">; setForm: (f: Omit<BrandPackage, "id">) => void }) {
  const updD = (i: number, patch: Partial<BrandDeliverable>) => {
    const list = form.deliverables.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    setForm({ ...form, deliverables: list, price: sum(list) });
  };
  const addD = () => setForm({ ...form, deliverables: [...form.deliverables, { name: "", price: 0 }] });
  const rmD = (i: number) => {
    const list = form.deliverables.filter((_, idx) => idx !== i);
    setForm({ ...form, deliverables: list, price: sum(list) });
  };
  return (
    <div className="space-y-3">
      <div><Label>Package Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Identity Pack" /></div>
      <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Deliverables (add as many as you want)</Label>
          <Button size="sm" variant="outline" onClick={addD}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
        <div className="space-y-2">
          {form.deliverables.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input placeholder="Deliverable name" value={d.name} onChange={(e) => updD(i, { name: e.target.value })} />
              <Input type="number" step="0.01" placeholder="Price DZD" value={d.price} onChange={(e) => updD(i, { price: +e.target.value })} />
              <Button size="icon" variant="ghost" onClick={() => rmD(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Total Price (DZD)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
        <div><Label>Optional USD Price</Label><Input type="number" step="0.01" value={form.priceUSD ?? 0} onChange={(e) => setForm({ ...form, priceUSD: +e.target.value })} /></div>
      </div>
    </div>
  );
}

/* -------------------------------- PROJECTS -------------------------------- */

function ProjectsTab({
  projects, packages, fx, addProject, updateProject, deleteProject,
}: {
  projects: BrandProject[];
  packages: BrandPackage[];
  fx: number;
  addProject: (p: Omit<BrandProject, "id">) => string;
  updateProject: (id: string, p: Partial<BrandProject>) => void;
  deleteProject: (id: string) => void;
}) {
  const settings = useApp((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BrandProject | null>(null);
  const [form, setForm] = useState<Omit<BrandProject, "id">>(emptyProject(fx));

  const openNew = () => { setEditing(null); setForm(emptyProject(fx)); setOpen(true); };
  const openEdit = (p: BrandProject) => { setEditing(p); setForm({ ...p }); setOpen(true); };

  const submit = () => {
    if (!form.clientName.trim()) return toast.error("Client name required");
    if (editing) updateProject(editing.id, form);
    else addProject(form);
    toast.success("Project saved");
    setOpen(false);
  };

  const exportFacture = (p: BrandProject | Omit<BrandProject, "id">) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    // Header band
    doc.setFillColor(30, 58, 138); // navy
    doc.rect(0, 0, pageW, 34, "F");
    if (settings.logoDataUrl) {
      try { doc.addImage(settings.logoDataUrl, "PNG", 14, 7, 20, 20); } catch { /* noop */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(settings.companyName, 40, 16);
    doc.setFontSize(9);
    if (settings.companyAddress) doc.text(settings.companyAddress, 40, 22);
    const contactBits = [settings.companyPhone, settings.companyEmail].filter(Boolean).join(" · ");
    if (contactBits) doc.text(contactBits, 40, 27);
    doc.setFontSize(22);
    doc.text("FACTURE", pageW - 14, 20, { align: "right" });

    // Meta
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`N° ${p.number}`, pageW - 14, 42, { align: "right" });
    doc.text(`Date: ${fmtDate(p.date)}`, pageW - 14, 48, { align: "right" });
    doc.text(`Status: ${p.status}`, pageW - 14, 54, { align: "right" });

    // Legal identifiers block
    let legalY = 42;
    doc.setFontSize(9);
    doc.setTextColor(90);
    if (settings.companyRC) { doc.text(`RC: ${settings.companyRC}`, 14, legalY); legalY += 5; }
    if (settings.companyNIF) { doc.text(`NIF: ${settings.companyNIF}`, 14, legalY); legalY += 5; }
    if (settings.companyAI) { doc.text(`AI: ${settings.companyAI}`, 14, legalY); legalY += 5; }

    // Bill to
    const y0 = Math.max(legalY, 60) + 4;
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Facturer à:", 14, y0);
    doc.setFont("helvetica", "normal");
    doc.text(p.clientName, 14, y0 + 6);
    if (p.company) doc.text(p.company, 14, y0 + 12);
    if (p.phone) doc.text(p.phone, 14, y0 + 18);
    if (p.email) doc.text(p.email, 14, y0 + 24);

    // Project title
    const y1 = y0 + 34;
    doc.setFont("helvetica", "bold");
    doc.text(`Projet: ${p.packageName || "Brand Identity"}`, 14, y1);

    // Deliverables table
    const rows = p.deliverables.map((d) => [d.name, d.note ?? "", fmtDZD(d.price)]);
    autoTable(doc, {
      startY: y1 + 4,
      head: [["Deliverable", "Note", "Montant (DZD)"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 8;

    const subtotal = p.priceDZD || sum(p.deliverables);
    const tax = subtotal * (settings.taxPercent || 0) / 100;
    const total = subtotal + tax;
    const remaining = total - (p.depositDZD || 0);

    doc.setFontSize(10);
    doc.text(`Sous-total: ${fmtDZD(subtotal)}`, pageW - 14, y, { align: "right" }); y += 6;
    if (settings.taxPercent > 0) { doc.text(`TVA (${settings.taxPercent}%): ${fmtDZD(tax)}`, pageW - 14, y, { align: "right" }); y += 6; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(`TOTAL: ${fmtDZD(total)}`, pageW - 14, y + 2, { align: "right" }); y += 10;
    if (p.priceUSD > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`≈ $${p.priceUSD.toFixed(2)} USD  (1 USD = ${p.fxRate} DZD)`, pageW - 14, y, { align: "right" }); y += 6;
    }
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
    if (p.depositDZD > 0) {
      doc.text(`Acompte reçu: ${fmtDZD(p.depositDZD)}`, pageW - 14, y, { align: "right" }); y += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`Reste à payer: ${fmtDZD(remaining)}`, pageW - 14, y, { align: "right" }); y += 8;
    }

    // Payment details
    if (settings.companyBank) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("Détails de paiement:", 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const bankLines = doc.splitTextToSize(settings.companyBank, pageW - 28);
      doc.text(bankLines, 14, y + 6);
    }

    // Footer
    if (settings.invoiceFooter) {
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(settings.invoiceFooter, 14, 285);
    }
    doc.save(`${p.number}.pdf`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Create a brand project, pick a saved package, and export a full facture.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Project</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Project" : "New Brand Project"}</DialogTitle></DialogHeader>
            <ProjectForm form={form} setForm={setForm} packages={packages} fx={fx} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => exportFacture(form)}><Download className="h-4 w-4 mr-1" /> Preview PDF</Button>
              <Button onClick={submit}>Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Total DZD</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No brand projects yet.</TableCell></TableRow>
              )}
              {projects.map((p) => {
                const remaining = Math.max(0, p.priceDZD - p.depositDZD);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{p.clientName}</span>
                        <span className="text-[10px] text-muted-foreground">{p.company}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{p.packageName}</span></TableCell>
                    <TableCell className="text-right font-medium">{fmtDZD(p.priceDZD)}</TableCell>
                    <TableCell className="text-right">{fmtDZD(p.depositDZD)}</TableCell>
                    <TableCell className="text-right">{fmtDZD(remaining)}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => updateProject(p.id, { status: v as BrandStatus })}>
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={statusVariant[p.status]} className="text-[10px]">{p.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" onClick={() => exportFacture(p)} title="Export facture PDF"><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) { deleteProject(p.id); toast.success("Deleted"); } }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function ProjectForm({
  form, setForm, packages, fx,
}: {
  form: Omit<BrandProject, "id">;
  setForm: (f: Omit<BrandProject, "id">) => void;
  packages: BrandPackage[];
  fx: number;
}) {
  const applyPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    setForm({
      ...form,
      packageId: pkg.id,
      packageName: pkg.name,
      deliverables: pkg.deliverables.map((d) => ({ ...d })),
      priceDZD: pkg.price,
      priceUSD: pkg.priceUSD ?? 0,
    });
    toast.success(`Loaded "${pkg.name}"`);
  };

  const updD = (i: number, patch: Partial<BrandDeliverable>) => {
    const list = form.deliverables.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    setForm({ ...form, deliverables: list, priceDZD: sum(list) });
  };
  const addD = () => setForm({ ...form, deliverables: [...form.deliverables, { name: "", price: 0 }] });
  const rmD = (i: number) => {
    const list = form.deliverables.filter((_, idx) => idx !== i);
    setForm({ ...form, deliverables: list, priceDZD: sum(list) });
  };

  return (
    <div className="space-y-4">
      {packages.length > 0 && (
        <div className="rounded-lg border border-border/60 p-3" style={{ background: "var(--gradient-card)" }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Load from saved packages
          </p>
          <div className="flex flex-wrap gap-2">
            {packages.map((p) => (
              <Button key={p.id} size="sm" variant="outline" onClick={() => applyPackage(p.id)}>
                {p.name} · {fmtDZD(p.price)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Invoice #</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
        <div><Label>Date</Label><Input type="date" value={form.date.slice(0,10)} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} /></div>
        <div><Label>Client Name</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
        <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="col-span-2"><Label>Package / Project Name</Label><Input value={form.packageName} onChange={(e) => setForm({ ...form, packageName: e.target.value })} placeholder="e.g. Brand Identity — Acme Corp" /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Deliverables</Label>
          <Button size="sm" variant="outline" onClick={addD}><Plus className="h-3.5 w-3.5 mr-1" /> Add line</Button>
        </div>
        <div className="space-y-2">
          {form.deliverables.length === 0 && (
            <p className="text-xs text-muted-foreground">Add lines manually or load a saved package above.</p>
          )}
          {form.deliverables.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_140px_auto] gap-2">
              <Input placeholder="Name" value={d.name} onChange={(e) => updD(i, { name: e.target.value })} />
              <Input placeholder="Note (optional)" value={d.note ?? ""} onChange={(e) => updD(i, { note: e.target.value })} />
              <Input type="number" step="0.01" placeholder="DZD" value={d.price} onChange={(e) => updD(i, { price: +e.target.value })} />
              <Button size="icon" variant="ghost" onClick={() => rmD(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><Label>Price (DZD)</Label><Input type="number" step="0.01" value={form.priceDZD} onChange={(e) => setForm({ ...form, priceDZD: +e.target.value })} /></div>
        <div><Label>Price (USD)</Label><Input type="number" step="0.01" value={form.priceUSD} onChange={(e) => setForm({ ...form, priceUSD: +e.target.value })} /></div>
        <div><Label>FX Rate</Label><Input type="number" step="0.01" value={form.fxRate} onChange={(e) => setForm({ ...form, fxRate: +e.target.value })} placeholder={`${fx}`} /></div>
        <div><Label>Deposit (DZD)</Label><Input type="number" step="0.01" value={form.depositDZD} onChange={(e) => setForm({ ...form, depositDZD: +e.target.value })} /></div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </div>
  );
}
