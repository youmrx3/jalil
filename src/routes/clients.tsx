import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Users,
  Wallet,
  DollarSign,
  Clock,
  Target,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { KPICard } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { NumericInput } from "@/components/numeric-input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp, type B2BClient, type PaymentStatus } from "@/lib/store";
import {
  clientBudgetDZD,
  clientPaymentRemaining,
  clientUsdProgressPct,
  clientUsdRemaining,
} from "@/lib/calc";
import { fmtDZD, fmtUSD, fmtNum } from "@/lib/format";
import { exportToExcel } from "@/lib/io";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "B2B Clients — Nexus Business" },
      {
        name: "description",
        content: "CRM for marketing agency clients with independent service fees and USD budget tracking.",
      },
    ],
  }),
  component: ClientsPage,
});

const PAY_STATUSES: PaymentStatus[] = ["Not Paid", "Partially Paid", "Paid", "Cancelled"];
const statusVariant: Record<PaymentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  "Not Paid": "destructive",
  "Partially Paid": "secondary",
  Paid: "default",
  Cancelled: "outline",
};

const empty: Omit<B2BClient, "id"> = {
  company: "",
  contactPerson: "",
  phone: "",
  email: "",
  country: "Algeria",
  industry: "",
  projectName: "",
  adBudgetUSD: 0,
  usdSpent: 0,
  durationDays: 30,
  servicePriceDZD: 0,
  amountReceivedDZD: 0,
  paymentStatus: "Not Paid",
  notes: "",
};

function ClientsPage() {
  const clients = useApp((s) => s.clients);
  const settings = useApp((s) => s.settings);
  const addClient = useApp((s) => s.addClient);
  const updateClient = useApp((s) => s.updateClient);
  const deleteClient = useApp((s) => s.deleteClient);
  const updateSettings = useApp((s) => s.updateSettings);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [form, setForm] = useState<Omit<B2BClient, "id">>(empty);

  const totals = useMemo(() => {
    let serviceRevenue = 0,
      received = 0,
      pending = 0,
      usdBudget = 0,
      usdSpent = 0;
    for (const c of clients) {
      serviceRevenue += c.servicePriceDZD || 0;
      received += c.amountReceivedDZD || 0;
      pending += clientPaymentRemaining(c);
      usdBudget += c.adBudgetUSD || 0;
      usdSpent += c.usdSpent || 0;
    }
    return { serviceRevenue, received, pending, usdBudget, usdSpent };
  }, [clients]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: B2BClient) => {
    setEditing(c);
    setForm({ ...c });
    setOpen(true);
  };
  const submit = () => {
    if (!form.company) return toast.error("Company required");
    const safe = {
      ...form,
      usdSpent: Math.min(form.usdSpent || 0, form.adBudgetUSD || 0),
    };
    if (editing) updateClient(editing.id, safe);
    else addClient(safe);
    toast.success("Saved");
    setOpen(false);
  };

  return (
    <AppLayout title="B2B Sponsor Clients">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPICard label="Total Clients" value={fmtNum(clients.length)} icon={Users} />
        <KPICard label="Service Revenue" value={fmtDZD(totals.serviceRevenue)} icon={DollarSign} tone="accent" hint="Agreed fees, independent of USD" />
        <KPICard label="Payments Received" value={fmtDZD(totals.received)} icon={Wallet} tone="success" />
        <KPICard label="Payments Pending" value={fmtDZD(totals.pending)} icon={Clock} tone="warning" />
      </div>

      <Card className="mb-3">
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Exchange Rate (1 USD = ? DZD)</Label>
            <NumericInput
              className="w-40"
              value={settings.fxRate}
              onValueChange={(n) => updateSettings({ fxRate: n })}
              min={0}
              placeholder="e.g. 250.25"
            />
          </div>
          <div className="flex-1 min-w-[180px] text-xs text-muted-foreground self-end">
            Ad budgets shown in DZD use this rate. Type decimals with a dot: <b>250.25</b>.
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportToExcel("clients", {
                  Clients: clients.map((c) => ({
                    Company: c.company,
                    Contact: c.contactPerson,
                    Phone: c.phone,
                    Email: c.email,
                    Country: c.country,
                    Industry: c.industry,
                    Project: c.projectName,
                    AdBudgetUSD: c.adBudgetUSD,
                    UsdSpent: c.usdSpent,
                    UsdRemaining: clientUsdRemaining(c),
                    DurationDays: c.durationDays ?? "",
                    ServiceFeeDZD: c.servicePriceDZD,
                    ReceivedDZD: c.amountReceivedDZD,
                    PaymentRemainingDZD: clientPaymentRemaining(c),
                    Status: c.paymentStatus,
                  })),
                })
              }
            >
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" /> Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Client" : "New Client"}</DialogTitle>
                </DialogHeader>
                <ClientForm form={form} setForm={setForm} fx={settings.fxRate} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submit}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Service Fee</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Payment Left</TableHead>
                <TableHead className="min-w-[240px]">Ad Budget (USD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No clients yet.
                  </TableCell>
                </TableRow>
              )}
              {clients.map((c) => {
                const pct = clientUsdProgressPct(c);
                const usdLeft = clientUsdRemaining(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{c.company}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.contactPerson} · {c.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{c.projectName}</span>
                        <span className="text-xs text-muted-foreground">{c.industry}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{fmtDZD(c.servicePriceDZD)}</TableCell>
                    <TableCell className="text-right">{fmtDZD(c.amountReceivedDZD)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtDZD(clientPaymentRemaining(c))}
                    </TableCell>
                    <TableCell>
                      <UsdSpendControl
                        client={c}
                        onChange={(usdSpent) => updateClient(c.id, { usdSpent })}
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {fmtUSD(c.usdSpent)} / {fmtUSD(c.adBudgetUSD)}
                        </span>
                        <span>{pct.toFixed(0)}% · {fmtUSD(usdLeft)} left</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.paymentStatus}
                        onValueChange={(v) =>
                          updateClient(c.id, { paymentStatus: v as PaymentStatus })
                        }
                      >
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={statusVariant[c.paymentStatus]} className="text-[10px]">
                            {c.paymentStatus}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {PAY_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete?")) {
                              deleteClient(c.id);
                              toast.success("Deleted");
                            }
                          }}
                        >
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {clients.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No clients yet.</p>
        )}
        {clients.map((c) => {
          const pct = clientUsdProgressPct(c);
          const usdLeft = clientUsdRemaining(c);
          return (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.company}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.projectName} · {c.industry}
                    </p>
                  </div>
                  <Badge variant={statusVariant[c.paymentStatus]} className="text-[10px] shrink-0">
                    {c.paymentStatus}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Fee</p>
                    <p className="font-medium">{fmtDZD(c.servicePriceDZD)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Received</p>
                    <p className="font-medium">{fmtDZD(c.amountReceivedDZD)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Left</p>
                    <p className="font-medium">{fmtDZD(clientPaymentRemaining(c))}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">USD Ad Budget</span>
                    <span>
                      {fmtUSD(c.usdSpent)} / {fmtUSD(c.adBudgetUSD)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <UsdSpendControl
                    client={c}
                    onChange={(usdSpent) => updateClient(c.id, { usdSpent })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtUSD(usdLeft)} left</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Delete?")) {
                        deleteClient(c.id);
                        toast.success("Deleted");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}

function UsdSpendControl({
  client,
  onChange,
}: {
  client: B2BClient;
  onChange: (usdSpent: number) => void;
}) {
  const max = client.adBudgetUSD || 0;
  const value = Math.min(client.usdSpent || 0, max);
  return (
    <div className="flex items-center gap-2">
      <Slider
        value={[value]}
        max={max || 1}
        step={0.01}
        onValueChange={([v]) => onChange(Math.max(0, Math.min(max, v)))}
        disabled={max <= 0}
        className="flex-1"
      />
      <NumericInput
        className="w-24 h-8 text-xs"
        value={value}
        onValueChange={(n) => onChange(Math.max(0, Math.min(max, n)))}
        min={0}
        max={max}
      />
    </div>
  );
}

function ClientForm({
  form,
  setForm,
  fx,
}: {
  form: Omit<B2BClient, "id">;
  setForm: (f: Omit<B2BClient, "id">) => void;
  fx: number;
}) {
  const upd = <K extends keyof Omit<B2BClient, "id">>(k: K, v: Omit<B2BClient, "id">[K]) =>
    setForm({ ...form, [k]: v });
  const effFx = form.fxRateOverride ?? fx;
  const budgetDZD = form.adBudgetUSD * effFx;
  const usdMax = form.adBudgetUSD || 0;
  const usdSpent = Math.min(form.usdSpent || 0, usdMax);
  const usdLeft = Math.max(0, usdMax - usdSpent);
  const paymentLeft = Math.max(0, (form.servicePriceDZD || 0) - (form.amountReceivedDZD || 0));

  return (
    <div className="space-y-4">
      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => upd("company", e.target.value)} />
        </div>
        <div>
          <Label>Contact Person</Label>
          <Input value={form.contactPerson} onChange={(e) => upd("contactPerson", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => upd("email", e.target.value)} />
        </div>
        <div>
          <Label>Country</Label>
          <Input value={form.country} onChange={(e) => upd("country", e.target.value)} />
        </div>
        <div>
          <Label>Industry</Label>
          <Input value={form.industry} onChange={(e) => upd("industry", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Project Name</Label>
          <Input value={form.projectName} onChange={(e) => upd("projectName", e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* Section 1 — MY PAYMENT (independent) */}
      <div className="rounded-md border border-border/60 p-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-[color:var(--electric)]" />
          <p className="text-sm font-semibold">My Service Fee (independent of USD)</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Service Fee (DZD)</Label>
            <NumericInput
              value={form.servicePriceDZD}
              onValueChange={(n) => upd("servicePriceDZD", n)}
              min={0}
              placeholder="e.g. 120000.50"
            />
          </div>
          <div>
            <Label>Amount Received (DZD)</Label>
            <NumericInput
              value={form.amountReceivedDZD}
              onValueChange={(n) => upd("amountReceivedDZD", n)}
              min={0}
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Payment remaining: <b className="text-foreground">{fmtDZD(paymentLeft)}</b>
        </p>
        <div className="mt-2">
          <Label className="text-xs">Payment Status</Label>
          <Select
            value={form.paymentStatus}
            onValueChange={(v) => upd("paymentStatus", v as PaymentStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 2 — CLIENT AD BUDGET (USD tracking) */}
      <div className="rounded-md border border-border/60 p-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-[color:var(--electric)]" />
          <p className="text-sm font-semibold">Client Ad Budget (USD tracking)</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Total Ad Budget (USD)</Label>
            <NumericInput
              value={form.adBudgetUSD}
              onValueChange={(n) => upd("adBudgetUSD", n)}
              min={0}
              placeholder="e.g. 3000.00"
            />
          </div>
          <div>
            <Label>Duration (days)</Label>
            <NumericInput
              value={form.durationDays ?? 0}
              onValueChange={(n) => upd("durationDays", n)}
              allowDecimals={false}
              min={0}
              placeholder="30"
            />
          </div>
          <div className="col-span-2">
            <Label>FX Override (optional)</Label>
            <NumericInput
              value={form.fxRateOverride ?? ""}
              onValueChange={(n) => upd("fxRateOverride", n || null)}
              min={0}
              placeholder={`Default ${fx}`}
            />
          </div>
        </div>
        <div className="mt-3 rounded-md bg-background p-2 text-xs">
          Budget in DZD (info only): {form.adBudgetUSD} × {effFx} ={" "}
          <b className="text-foreground">{fmtDZD(budgetDZD)}</b>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <Label className="text-xs">USD Spent so far</Label>
            <span className="text-muted-foreground">
              {fmtUSD(usdSpent)} / {fmtUSD(usdMax)} · {fmtUSD(usdLeft)} left
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              value={[usdSpent]}
              max={usdMax || 1}
              step={0.01}
              disabled={usdMax <= 0}
              onValueChange={([v]) => upd("usdSpent", Math.max(0, Math.min(usdMax, v)))}
              className="flex-1"
            />
            <NumericInput
              className="w-28"
              value={usdSpent}
              onValueChange={(n) => upd("usdSpent", Math.max(0, Math.min(usdMax, n)))}
              min={0}
              max={usdMax}
            />
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usdMax > 0 ? (usdSpent / usdMax) * 100 : 0}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
