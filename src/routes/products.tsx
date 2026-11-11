import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Package,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp, type Product } from "@/lib/store";
import { productStats, sellingPrice, totalCostPerPiece, profitPerPiece } from "@/lib/calc";
import { fmtDZD, fmtNum } from "@/lib/format";
import { exportToExcel } from "@/lib/io";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & Stock — Nexus Business" },
      { name: "description", content: "Manage products, live stock, and profit per piece." },
    ],
  }),
  component: ProductsPage,
});

const emptyProduct: Omit<Product, "id"> = {
  name: "",
  sku: "",
  category: "",
  supplier: "",
  cpp: 0,
  desiredProfit: 0,
  shippingCost: 0,
  facebookAdCost: 0,
  packagingCost: 0,
  returnCost: 0,
  stock: 0,
  minStock: 0,
  notes: "",
};

function ProductsPage() {
  const products = useApp((s) => s.products);
  const orders = useApp((s) => s.orders);
  const addProduct = useApp((s) => s.addProduct);
  const updateProduct = useApp((s) => s.updateProduct);
  const deleteProduct = useApp((s) => s.deleteProduct);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.sku.toLowerCase().includes(q.toLowerCase()) ||
          p.category.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q],
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyProduct);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };
  const submit = () => {
    if (!form.name) return toast.error("Product name is required");
    if (editing) {
      updateProduct(editing.id, form);
      toast.success("Product updated");
    } else {
      addProduct(form);
      toast.success("Product added");
    }
    setOpen(false);
  };

  const exportRows = filtered.map((p) => {
    const s = productStats(p, orders);
    return {
      Name: p.name,
      Code: p.sku,
      Category: p.category,
      Supplier: p.supplier,
      PurchaseCost: p.cpp,
      Shipping: p.shippingCost,
      FacebookAd: p.facebookAdCost,
      Packaging: p.packagingCost,
      TotalCost: totalCostPerPiece(p),
      SellingPrice: sellingPrice(p),
      ProfitPerPiece: profitPerPiece(p),
      Stock: p.stock,
      MinStock: p.minStock,
      Delivered: s.delivered,
      Returned: s.returned,
      Revenue: s.revenue,
      NetProfit: s.netProfit,
    };
  });

  return (
    <AppLayout title="Products & Stock">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code or category…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => exportToExcel("products", { Products: exportRows })}
          >
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
                  <DialogDescription>
                    Enter your product details. All costs are per single piece unless noted.
                  </DialogDescription>
                </DialogHeader>
                <ProductForm form={form} setForm={setForm} />
              </div>
              <div className="sticky bottom-0 border-t bg-card p-4">
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submit}>Save Product</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first product or load the demo data to explore.
            </p>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mobile card list */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((p) => {
          const s = productStats(p, orders);
          const low = p.stock <= p.minStock;
          const out = p.stock <= 0;
          return (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{p.name}</p>
                      {out ? (
                        <Badge variant="destructive" className="text-[10px]">Out of stock</Badge>
                      ) : low ? (
                        <Badge variant="destructive" className="text-[10px]">Low</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.category || "Uncategorized"} · Code {p.sku || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) {
                          deleteProduct(p.id);
                          toast.success("Deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Metric label="Selling" value={fmtDZD(sellingPrice(p))} tone="accent" />
                  <Metric label="Profit/pc" value={fmtDZD(profitPerPiece(p))} tone="success" />
                  <Metric label="Stock" value={fmtNum(p.stock)} tone={out ? "danger" : low ? "warning" : "default"} />
                  <Metric label="Delivered" value={fmtNum(s.delivered)} />
                  <Metric label="Returned" value={fmtNum(s.returned)} />
                  <Metric label="Net Profit" value={fmtDZD(s.netProfit)} tone="success" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      {filtered.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">Profit/pc</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const s = productStats(p, orders);
                  const low = p.stock <= p.minStock;
                  const out = p.stock <= 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.category || "—"} · {p.sku || "no code"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{fmtDZD(totalCostPerPiece(p))}</TableCell>
                      <TableCell className="text-right font-medium">{fmtDZD(sellingPrice(p))}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {fmtDZD(profitPerPiece(p))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={out ? "text-destructive font-medium" : low ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                            {fmtNum(p.stock)}
                          </span>
                          {out ? (
                            <Badge variant="destructive" className="text-[10px]">Out</Badge>
                          ) : low ? (
                            <Badge variant="destructive" className="text-[10px]">Low</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{fmtNum(s.delivered)}</TableCell>
                      <TableCell className="text-right">{fmtNum(s.returned)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtDZD(s.netProfit)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) {
                                deleteProduct(p.id);
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
      )}
    </AppLayout>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}) {
  const toneMap = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
    accent: "text-[color:var(--electric)]",
  };
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${toneMap[tone]}`}>{value}</p>
    </div>
  );
}

function ProductForm({
  form,
  setForm,
}: {
  form: Omit<Product, "id">;
  setForm: (f: Omit<Product, "id">) => void;
}) {
  const upd = <K extends keyof Omit<Product, "id">>(k: K, v: Omit<Product, "id">[K]) =>
    setForm({ ...form, [k]: v });

  const totalCost =
    (form.cpp || 0) + (form.shippingCost || 0) + (form.facebookAdCost || 0) + (form.packagingCost || 0);
  const auto = totalCost + (form.desiredProfit || 0);
  const finalPrice = form.sellingPriceOverride ?? auto;
  const profit = finalPrice - totalCost;

  const num = (v: number) => (v === 0 ? "" : v);

  return (
    <TooltipProvider>
      <div className="space-y-5 mt-4">
        {/* Basic info */}
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g. Smart Watch X1"
                value={form.name}
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Product Code
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] cursor-help">
                      ?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    A short internal code to identify this product (e.g. SW-X1). Leave blank to
                    generate one automatically.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                placeholder="Auto-generated if empty"
                value={form.sku}
                onChange={(e) => upd("sku", e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                placeholder="e.g. Electronics"
                value={form.category}
                onChange={(e) => upd("category", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Supplier</Label>
              <Input
                placeholder="Where you buy this product"
                value={form.supplier}
                onChange={(e) => upd("supplier", e.target.value)}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Costs */}
        <section>
          <h3 className="text-sm font-semibold mb-1">Costs per Piece (DZD)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Enter every cost you pay for a single delivered piece. These build the full price.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField
              label="Purchase Cost"
              hint="What you pay the supplier per piece."
              value={form.cpp}
              onChange={(v) => upd("cpp", v)}
            />
            <NumField
              label="Shipping Cost"
              hint="Delivery fee per piece (to customer or warehouse)."
              value={form.shippingCost}
              onChange={(v) => upd("shippingCost", v)}
            />
            <NumField
              label="Facebook Ad Cost"
              hint="Average Meta / Facebook ad spend per delivered order."
              value={form.facebookAdCost}
              onChange={(v) => upd("facebookAdCost", v)}
            />
            <NumField
              label="Packaging Cost"
              hint="Box, bag, insert, tape — per piece."
              value={form.packagingCost}
              onChange={(v) => upd("packagingCost", v)}
            />
            <NumField
              label="Return Cost"
              hint="What you lose when an order is returned (return shipping + damage)."
              value={form.returnCost}
              onChange={(v) => upd("returnCost", v)}
            />
            <NumField
              label="Desired Profit"
              hint="Profit you want on top of the total cost."
              value={form.desiredProfit}
              onChange={(v) => upd("desiredProfit", v)}
            />
          </div>
        </section>

        <Separator />

        {/* Price preview */}
        <section className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[color:var(--electric)]" />
            <h3 className="text-sm font-semibold">Price Calculator</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
            <PriceLine label="Purchase" value={form.cpp} />
            <PriceLine label="+ Shipping" value={form.shippingCost} />
            <PriceLine label="+ FB Ads" value={form.facebookAdCost} />
            <PriceLine label="+ Packaging" value={form.packagingCost} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-background p-2 border">
              <p className="text-[10px] uppercase text-muted-foreground">Total Cost</p>
              <p className="font-semibold">{fmtDZD(totalCost)}</p>
            </div>
            <div className="rounded-md bg-background p-2 border">
              <p className="text-[10px] uppercase text-muted-foreground">Selling Price</p>
              <p className="font-semibold text-[color:var(--electric)]">{fmtDZD(finalPrice)}</p>
            </div>
            <div className="rounded-md bg-background p-2 border">
              <p className="text-[10px] uppercase text-muted-foreground">Profit / Piece</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtDZD(profit)}</p>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Manual Selling Price Override (optional)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={`Auto: ${auto} DZD`}
              value={form.sellingPriceOverride ?? ""}
              onChange={(e) =>
                upd("sellingPriceOverride", e.target.value ? +e.target.value : null)
              }
            />
          </div>
        </section>

        <Separator />

        {/* Stock */}
        <section>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Stock Tracking
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Stock is deducted automatically each time you add a new order for this product.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Stock</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={num(form.stock)}
                onChange={(e) => upd("stock", +e.target.value)}
              />
            </div>
            <div>
              <Label>Low-stock Alert At</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={num(form.minStock)}
                onChange={(e) => upd("minStock", +e.target.value)}
              />
            </div>
          </div>
        </section>

        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => upd("notes", e.target.value)}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function NumField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] cursor-help">
              ?
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px]">{hint}</TooltipContent>
        </Tooltip>
      </Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          className="pr-12"
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(+e.target.value)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          DZD
        </span>
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5 border">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{fmtDZD(value)}</span>
    </div>
  );
}
